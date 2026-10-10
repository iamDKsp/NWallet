const fs = require('fs');

const desktopJsx = fs.readFileSync('scratch_desktop_jsx.js', 'utf8');

const testCode = `
function test(b, se, jt, pd, A, e, t, n, r, o, s, u, c, d, h, p, m, y, x, w, S, j, O, E, N, _, C, P, k, B, V, $, I, H, he, fe, me, L, Q, U, ne, de, D, Z, le, G, X, ae, pe, ye, ie, ce, Ae, oe, vt, _e, Rt, bt, Ln, ga, Fs, jn, ya, bm, Ks, an, xm, yo, sc, vo, wm, lc, vie, pie, Vy, yie, gie, fie, yne, vne, bne, xne, wne, die, mie, xie, md, io, Ts, wu, Oh, sd, Vb, ag, Ad, mv, ld, fu, Ja, pv, c5, p9, s5, G9) {
  ${desktopJsx}
}
`;

try {
  new Function(testCode);
  console.log('Desktop JSX syntax is 100% VALID!');
} catch (err) {
  console.error('Syntax error:', err);
  process.exit(1);
}
