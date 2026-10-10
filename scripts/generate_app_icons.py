import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

SRC_PATH = r"C:\Users\DKS\Downloads\NW\Icone.png"
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

def main():
    if not os.path.exists(SRC_PATH):
        raise FileNotFoundError(f"Source file not found at {SRC_PATH}")

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Master image (clean crop 6px border artifact from screen export)
    raw_img = Image.open(SRC_PATH).convert("RGBA")
    w, h = raw_img.size
    # Crop outer 6px border if 1024x1024
    if w == 1024 and h == 1024:
        cropped = raw_img.crop((6, 6, 1018, 1018))
        master = cropped.resize((1024, 1024), Image.Resampling.LANCZOS)
    else:
        master = raw_img

    print("Master image prepared: 1024x1024 RGBA")

    # 1. Save master app-icon.png
    master.save(os.path.join(PUBLIC_DIR, "app-icon.png"), "PNG", optimize=True)
    master.save(os.path.join(PUBLIC_DIR, "icon.png"), "PNG", optimize=True)

    # 2. Standard PWA & launcher icons (any purpose)
    sizes = [
        (512, "icon-512.png"),
        (192, "icon-192.png"),
        (180, "apple-touch-icon.png"),
        (180, "apple-touch-icon-180x180.png"),
        (152, "apple-touch-icon-152x152.png"),
        (167, "apple-touch-icon-167x167.png"),
        (96, "favicon.png"),
        (48, "icon-48.png"),
        (32, "favicon-32x32.png"),
        (16, "favicon-16x16.png"),
    ]

    for size, name in sizes:
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        # For small favicons, enhance contrast and sharpness slightly so the pixel shades & outline pop
        if size <= 32:
            resized = ImageEnhance.Sharpness(resized).enhance(1.8)
            resized = ImageEnhance.Contrast(resized).enhance(1.15)
        out_path = os.path.join(PUBLIC_DIR, name)
        resized.save(out_path, "PNG", optimize=True)
        print(f"Generated {name} ({size}x{size})")

    # 3. Multi-resolution favicon.ico (16, 32, 48)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    master.save(
        os.path.join(PUBLIC_DIR, "favicon.ico"),
        format="ICO",
        sizes=ico_sizes
    )
    print("Generated favicon.ico (16x16, 32x32, 48x48)")

    # 4. Maskable icons for Android (with 15% safe-zone margin on dark background)
    for size, name in [(512, "icon-maskable-512.png"), (192, "icon-maskable-192.png")]:
        maskable = Image.new("RGBA", (size, size), (5, 8, 13, 255))
        # Draw background matching dark theme
        scaled_size = int(size * 0.80)
        inner = master.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
        offset = (size - scaled_size) // 2
        maskable.paste(inner, (offset, offset), inner)
        maskable.save(os.path.join(PUBLIC_DIR, name), "PNG", optimize=True)
        print(f"Generated maskable {name} ({size}x{size})")

    # 5. Open Graph / WhatsApp Preview Banner (1200x630)
    W, H = 1200, 630
    og_base = Image.new("RGBA", (W, H), (5, 8, 13, 255))
    draw = ImageDraw.Draw(og_base)

    # Tech background gradient
    for y in range(H):
        t = y / H
        r = int(4 + t * 4)
        g = int(8 + t * 14)
        b = int(12 + t * 6)
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Radial emerald glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    cx, cy = 290, 315
    for radius in range(360, 40, -10):
        alpha = int(42 * (1 - radius / 360))
        gdraw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=(0, 229, 153, alpha))
    og_base = Image.alpha_composite(og_base, glow)

    # Icon with rounded corners and neon rim
    icon_size = 420
    icon_resized = master.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

    mask = Image.new("L", (icon_size, icon_size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, icon_size, icon_size], radius=88, fill=255)

    ix = cx - icon_size // 2
    iy = cy - icon_size // 2

    # Soft glow behind icon
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([ix - 12, iy - 12, ix + icon_size + 12, iy + icon_size + 12], radius=94, fill=(0, 229, 153, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    og_base = Image.alpha_composite(og_base, shadow)

    og_base.paste(icon_resized, (ix, iy), mask)

    # Emerald border
    border = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(border)
    bdraw.rounded_rectangle([ix, iy, ix + icon_size, iy + icon_size], radius=88, outline=(0, 229, 153, 160), width=3)
    og_base = Image.alpha_composite(og_base, border)

    # Typography
    font_badge = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 15)
    font_title = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 64)
    font_subtitle = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 30)
    font_desc = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 22)
    font_pill = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 16)
    font_meta = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 16)

    text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer)
    tx = 560

    # Badge
    badge_text = "• SISTEMA INTELIGENTE DE FINANÇAS"
    badge_bbox = tdraw.textbbox((0, 0), badge_text, font=font_badge)
    bw = badge_bbox[2] - badge_bbox[0] + 28
    tdraw.rounded_rectangle([tx, 105, tx + bw, 105 + 32], radius=16, fill=(0, 229, 153, 24), outline=(0, 229, 153, 130), width=1)
    tdraw.text((tx + 14, 111), badge_text, fill=(0, 229, 153, 255), font=font_badge)

    # Title
    tdraw.text((tx, 155), "NWallet", fill=(255, 255, 255, 255), font=font_title)

    # Subtitle
    tdraw.text((tx, 238), "Gestão Financeira Inteligente", fill=(0, 229, 153, 255), font=font_subtitle)

    # Description
    tdraw.text((tx, 292), "Controle total do seu dinheiro, contas e compromissos", fill=(215, 225, 235, 255), font=font_desc)
    tdraw.text((tx, 325), "com relatórios em tempo real e inteligência artificial.", fill=(160, 175, 190, 255), font=font_desc)

    # Tags
    tags = ["• Tempo Real", "• Fluxo de Caixa", "• 100% Seguro", "• IA Integrada"]
    tag_x = tx
    tag_y = 392
    for tag in tags:
        tbbox = tdraw.textbbox((0, 0), tag, font=font_pill)
        tw = tbbox[2] - tbbox[0] + 24
        tdraw.rounded_rectangle([tag_x, tag_y, tag_x + tw, tag_y + 36], radius=10, fill=(18, 30, 26, 230), outline=(40, 75, 60, 255), width=1)
        tdraw.text((tag_x + 12, tag_y + 8), tag, fill=(215, 240, 230, 255), font=font_pill)
        tag_x += tw + 12

    # Meta footer
    tdraw.line([(tx, 475), (tx + 560, 475)], fill=(28, 46, 40, 255), width=1)
    tdraw.text((tx, 492), "Disponível no Navegador • iPhone • Android • Windows • Mac", fill=(125, 145, 140, 255), font=font_meta)

    og_base = Image.alpha_composite(og_base, text_layer)
    og_base.save(os.path.join(PUBLIC_DIR, "og-image.png"), "PNG", optimize=True)
    print("Generated og-image.png (1200x630, <200KB)")

    # 6. Square Open Graph image (600x600)
    SW, SH = 600, 600
    sq_base = Image.new("RGBA", (SW, SH), (5, 8, 13, 255))
    s_draw = ImageDraw.Draw(sq_base)
    for y in range(SH):
        t = y / SH
        r = int(4 + t * 4)
        g = int(8 + t * 14)
        b = int(12 + t * 6)
        s_draw.line([(0, y), (SW, y)], fill=(r, g, b, 255))

    sq_glow = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    sq_gdraw = ImageDraw.Draw(sq_glow)
    scx, scy = 300, 260
    for radius in range(280, 30, -10):
        alpha = int(40 * (1 - radius / 280))
        sq_gdraw.ellipse([scx - radius, scy - radius, scx + radius, scy + radius], fill=(0, 229, 153, alpha))
    sq_base = Image.alpha_composite(sq_base, sq_glow)

    sq_icon_size = 360
    sq_icon_resized = master.resize((sq_icon_size, sq_icon_size), Image.Resampling.LANCZOS)
    sq_mask = Image.new("L", (sq_icon_size, sq_icon_size), 0)
    sq_mdraw = ImageDraw.Draw(sq_mask)
    sq_mdraw.rounded_rectangle([0, 0, sq_icon_size, sq_icon_size], radius=76, fill=255)

    six = scx - sq_icon_size // 2
    siy = scy - sq_icon_size // 2

    sq_shadow = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    sq_sdraw = ImageDraw.Draw(sq_shadow)
    sq_sdraw.rounded_rectangle([six - 10, siy - 10, six + sq_icon_size + 10, siy + sq_icon_size + 10], radius=82, fill=(0, 229, 153, 50))
    sq_shadow = sq_shadow.filter(ImageFilter.GaussianBlur(14))
    sq_base = Image.alpha_composite(sq_base, sq_shadow)

    sq_base.paste(sq_icon_resized, (six, siy), sq_mask)

    sq_border = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    sq_bdraw = ImageDraw.Draw(sq_border)
    sq_bdraw.rounded_rectangle([six, siy, six + sq_icon_size, siy + sq_icon_size], radius=76, outline=(0, 229, 153, 160), width=3)
    sq_base = Image.alpha_composite(sq_base, sq_border)

    sq_text_layer = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    sq_tdraw = ImageDraw.Draw(sq_text_layer)

    title = "NWallet"
    t_bbox = sq_tdraw.textbbox((0, 0), title, font=ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 44))
    tw = t_bbox[2] - t_bbox[0]
    sq_tdraw.text(((SW - tw) // 2, 470), title, fill=(255, 255, 255, 255), font=ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 44))

    subtitle = "Gestão Financeira Inteligente"
    s_bbox = sq_tdraw.textbbox((0, 0), subtitle, font=ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 20))
    sw = s_bbox[2] - s_bbox[0]
    sq_tdraw.text(((SW - sw) // 2, 530), subtitle, fill=(0, 229, 153, 255), font=ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 20))

    sq_base = Image.alpha_composite(sq_base, sq_text_layer)
    sq_base.save(os.path.join(PUBLIC_DIR, "og-image-square.png"), "PNG", optimize=True)
    print("Generated og-image-square.png (600x600)")

    # 7. Update wallet.svg with the official icon embedded
    import base64
    with open(os.path.join(PUBLIC_DIR, "icon-512.png"), "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    svg_content = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">\n'
        f'  <image href="data:image/png;base64,{b64}" width="512" height="512" preserveAspectRatio="xMidYMid meet"/>\n'
        '</svg>\n'
    )
    with open(os.path.join(PUBLIC_DIR, "wallet.svg"), "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Generated wallet.svg")

    # Clean up test files if any
    for t in ["test_og.png", "test_og.jpg", "test_og_square.png"]:
        tp = os.path.join(PUBLIC_DIR, t)
        if os.path.exists(tp):
            os.remove(tp)

if __name__ == "__main__":
    main()
