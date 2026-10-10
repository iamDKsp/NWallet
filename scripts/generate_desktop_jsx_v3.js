const fs = require('fs');

const desktopJsxV3 = `
return b.jsxs("div", {
  className: "desktop-shell",
  children: [
    // 1. Topbar Glassmorphic Navigation
    b.jsxs("header", {
      className: "desktop-topbar",
      children: [
        // Left: Logo
        b.jsxs("div", {
          className: "flex items-center gap-3 cursor-pointer select-none",
          onClick: () => t("Home"),
          children: [
            b.jsx("div", {
              className: "w-10 h-10 rounded-xl bg-green-primary/20 border border-green-primary/40 flex items-center justify-center text-green-primary shadow-lg shadow-green-500/10",
              children: b.jsx(ag, { size: 22, strokeWidth: 2.5 })
            }),
            b.jsx("span", { className: "font-display font-extrabold text-xl tracking-tight text-white", children: "NWallet" })
          ]
        }),

        // Center: Nav Tabs
        b.jsx("nav", {
          className: "flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-inner",
          children: [
            { id: "Home", label: "Início", icon: p9 },
            { id: "Statistic", label: "Estatísticas", icon: s5 },
            { id: "Wallet", label: "Carteira", icon: G9 },
            { id: "Setting", label: "Ajustes", icon: fu }
          ].map(item => {
            const active = e === item.id;
            return b.jsxs("button", {
              key: item.id,
              onClick: () => { _("light"); t(item.id); },
              className: "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer " + (active ? "bg-green-primary text-[#05080d] shadow-md shadow-green-500/25 font-bold" : "text-white/60 hover:text-white hover:bg-white/5"),
              children: [
                b.jsx(item.icon, { size: 16 }),
                b.jsx("span", { children: item.label })
              ]
            });
          })
        }),

        // Right Controls
        b.jsxs("div", {
          className: "flex items-center gap-3 select-none",
          children: [
            // Bell Notification
            b.jsxs("button", {
              id: "desktop-notif-btn",
              onClick: () => le(!0),
              className: "w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white relative transition-all cursor-pointer",
              children: [
                b.jsx(Ts, { size: 18 }),
                b.jsx("span", { className: "absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-primary" })
              ]
            }),
            // Dark Mode
            b.jsx("button", {
              onClick: () => H(!I),
              className: "w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer",
              children: b.jsx(ld, { size: 18 })
            }),
            // Profile
            b.jsxs("div", {
              onClick: () => t("Setting"),
              className: "flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all",
              children: [
                b.jsx("img", { src: V, alt: "Profile", className: "w-7 h-7 rounded-lg object-cover", referrerPolicy: "no-referrer" }),
                b.jsx("span", { className: "text-xs font-semibold text-white/90", children: C })
              ]
            }),
            // Nexus IA Button
            b.jsxs(se.button, {
              onClick: () => { _("medium"); pe(!0); },
              whileHover: { scale: 1.05 },
              whileTap: { scale: 0.95 },
              className: "flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-green-500/30 border border-green-primary/50 text-green-primary hover:border-green-primary transition-all shadow-lg shadow-green-500/10 cursor-pointer",
              children: [
                b.jsx(md, { isTalking: ae || ye, size: 24 }),
                b.jsx("span", { className: "text-xs font-bold tracking-wide uppercase", children: "Nexus IA" })
              ]
            })
          ]
        })
      ]
    }),

    // 2. Main Scrollable Viewport (handles mouse wheel and scroll smoothly!)
    b.jsxs("div", {
      className: "desktop-main-viewport",
      id: "desktop-scroll-area",
      children: [
        // Ambient background lights
        b.jsx("div", { className: "absolute top-10 left-1/4 w-[500px] h-[500px] bg-green-primary/5 rounded-full blur-[140px] pointer-events-none" }),
        b.jsx("div", { className: "absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" }),

        b.jsx(jt, {
          mode: "wait",
          children: e === "Home" ? b.jsxs("div", {
            className: "desktop-container",
            children: [
              // Greeting Row
              b.jsxs("div", {
                className: "flex justify-between items-center mb-6",
                children: [
                  b.jsxs("div", {
                    children: [
                      b.jsxs("h1", {
                        className: "text-2xl font-display font-bold text-white tracking-tight",
                        children: ["Olá, ", b.jsx("span", { className: "text-green-primary", children: C }), "! 👋"]
                      }),
                      b.jsx("p", {
                        className: "text-xs text-zinc-400 mt-1 font-medium",
                        children: "Visão geral das suas contas, despesas e investimentos."
                      })
                    ]
                  }),
                  b.jsx("div", {
                    className: "text-right",
                    children: b.jsx("span", {
                      className: "text-xs font-semibold text-zinc-400 px-3 py-1 rounded-lg bg-white/5 border border-white/10",
                      children: new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
                    })
                  })
                ]
              }),

              // Main Responsive Grid: Left Column (MinMax flexible) + Right Column (370px fixed)
              b.jsxs("div", {
                className: "desktop-grid",
                children: [
                  // Left Column (Main Dashboard Content)
                  b.jsxs("div", {
                    className: "flex flex-col gap-6 min-w-0",
                    children: [
                      // Top Subgrid: Saldo Gauge (Left) + Ações Rápidas & Métricas (Right)
                      b.jsxs("div", {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-6",
                        children: [
                          // Card 1A: Saldo & Arc Gauge
                          b.jsx("div", {
                            className: "desktop-card flex flex-col items-center justify-center p-5 relative overflow-hidden",
                            children: b.jsx(pie, {
                              isDarkMode: I,
                              balance: bt.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                              percentage: Math.max(10, Math.min(100, bt / 5e3 * 100)),
                              transactions: _e
                            })
                          }),

                          // Card 1B: Ações Rápidas & Métricas do Mês
                          b.jsxs("div", {
                            className: "desktop-card flex flex-col justify-between p-6",
                            children: [
                              b.jsxs("div", {
                                children: [
                                  b.jsx("h3", { className: "text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4", children: "Ações Rápidas" }),
                                  // 3 Big Action Buttons
                                  b.jsxs("div", {
                                    className: "grid grid-cols-3 gap-3 mb-6",
                                    children: [
                                      b.jsxs("button", {
                                        onClick: () => { _("light"); ne("expense"); },
                                        className: "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 transition-all cursor-pointer group",
                                        children: [
                                          b.jsx("div", { className: "w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform", children: b.jsx(wu, { size: 18 }) }),
                                          b.jsx("span", { className: "text-xs font-bold", children: "Despesa" })
                                        ]
                                      }),
                                      b.jsxs("button", {
                                        onClick: () => { _("light"); ne("income"); },
                                        className: "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-primary transition-all cursor-pointer group",
                                        children: [
                                          b.jsx("div", { className: "w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center text-green-primary group-hover:scale-110 transition-transform", children: b.jsx(Oh, { size: 18 }) }),
                                          b.jsx("span", { className: "text-xs font-bold", children: "Receita" })
                                        ]
                                      }),
                                      b.jsxs("button", {
                                        onClick: () => { _("light"); D(!0); },
                                        className: "flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/90 transition-all cursor-pointer group",
                                        children: [
                                          b.jsx("div", { className: "w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 group-hover:scale-110 transition-transform", children: b.jsx(sd, { size: 18 }) }),
                                          b.jsx("span", { className: "text-xs font-bold", children: "Importar" })
                                        ]
                                      })
                                    ]
                                  })
                                ]
                              }),

                              // Monthly Indicators Box
                              b.jsxs("div", {
                                className: "p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between",
                                children: [
                                  b.jsxs("div", {
                                    children: [
                                      b.jsx("p", { className: "text-[11px] text-zinc-400 font-medium", children: "Entradas Mês" }),
                                      b.jsx("p", { className: "text-sm font-bold text-green-primary mt-0.5", children: "+R$ 4.200,00" })
                                    ]
                                  }),
                                  b.jsx("div", { className: "w-[1px] h-8 bg-white/10" }),
                                  b.jsxs("div", {
                                    children: [
                                      b.jsx("p", { className: "text-[11px] text-zinc-400 font-medium", children: "Saídas Mês" }),
                                      b.jsx("p", { className: "text-sm font-bold text-rose-400 mt-0.5", children: "-R$ 1.323,10" })
                                    ]
                                  }),
                                  b.jsx("div", { className: "w-[1px] h-8 bg-white/10" }),
                                  b.jsxs("div", {
                                    children: [
                                      b.jsx("p", { className: "text-[11px] text-zinc-400 font-medium", children: "Economizado" }),
                                      b.jsx("p", { className: "text-sm font-bold text-emerald-400 mt-0.5", children: "R$ 2.876,90" })
                                    ]
                                  })
                                ]
                              })
                            ]
                          })
                        ]
                      }),

                      // Transações Recentes (Horizontal 4 Cards Preview + Full Extrato)
                      b.jsxs("div", {
                        className: "desktop-card p-6",
                        children: [
                          b.jsxs("div", {
                            className: "flex justify-between items-center mb-5",
                            children: [
                              b.jsxs("div", {
                                children: [
                                  b.jsx("h3", { className: "text-lg font-bold font-display text-white", children: "Transações Recentes" }),
                                  b.jsx("p", { className: "text-xs text-zinc-400 mt-0.5", children: "Últimas movimentações e pagamentos registrados" })
                                ]
                              }),
                              b.jsx("span", {
                                className: "text-xs font-bold text-green-primary px-3 py-1 rounded-full bg-green-primary/10 border border-green-primary/20",
                                children: _e.length + " movimentações"
                              })
                            ]
                          }),

                          // Horizontal Quick Transaction Cards
                          b.jsx("div", {
                            className: "grid grid-cols-2 md:grid-cols-4 gap-3 mb-6",
                            children: _e.slice(0, 4).map(ue => b.jsxs("div", {
                              key: ue.id,
                              className: "bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 relative overflow-hidden group hover:border-green-primary/30 transition-all",
                              children: [
                                b.jsxs("div", {
                                  className: "flex items-center gap-2",
                                  children: [
                                    b.jsx("div", { className: "w-7 h-7 rounded-lg bg-green-primary/10 flex items-center justify-center text-green-primary", children: b.jsx(ue.icon, { size: 14 }) }),
                                    b.jsx("span", { className: "text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none", children: ue.category })
                                  ]
                                }),
                                b.jsx("h4", { className: "text-xs font-bold truncate text-white", children: ue.merchant }),
                                b.jsxs("div", {
                                  className: "mt-auto",
                                  children: [
                                    b.jsx("p", { className: "text-green-primary font-bold text-xs", children: ue.amount }),
                                    b.jsx("p", { className: "text-[9px] text-gray-400 font-medium", children: ue.date })
                                  ]
                                })
                              ]
                            }))
                          }),

                          // Calendar, Week selector and list (fie)
                          b.jsx(fie, {
                            transactions: _e,
                            cards: oe,
                            isDarkMode: I,
                            appointments: ce,
                            onUpdateAppointments: Ae
                          })
                        ]
                      })
                    ]
                  }),

                  // Right Column (Sidebar - 370px fixed width, fits cards perfectly!)
                  b.jsxs("div", {
                    className: "flex flex-col gap-6",
                    style: { width: "100%", maxWidth: "370px" },
                    children: [
                      // Cards Panel
                      b.jsxs("div", {
                        className: "desktop-card p-6 overflow-visible",
                        children: [
                          b.jsxs("div", {
                            className: "flex justify-between items-center mb-5",
                            children: [
                              b.jsxs("div", {
                                children: [
                                  b.jsx("h2", { className: "text-lg font-bold font-display text-white", children: "Meus Cartões" }),
                                  b.jsx("p", { className: "text-[11px] text-zinc-400 mt-0.5", children: "Arraste ou passe o mouse para inclinação 3D" })
                                ]
                              }),
                              b.jsx(se.button, {
                                id: "add-card-desktop",
                                whileHover: { scale: 1.1 },
                                whileTap: { scale: 0.9 },
                                onClick: () => { _("medium"); s(!0); },
                                className: "w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-green-primary/20 text-green-primary border border-white/10 hover:border-green-primary/30 transition-all cursor-pointer",
                                children: b.jsx(Vb, { size: 18, strokeWidth: 2.5 })
                              })
                            ]
                          }),
                          // 3D Cards Stack
                          b.jsx("div", {
                            className: "flex flex-col gap-4 relative",
                            style: { width: "100%", minHeight: "220px" },
                            children: d ? [0, 1, 2].map(ue => b.jsx(yie, { index: ue }, ue)) : oe.map((ue, Ee) => b.jsx(gie, {
                              index: Ee,
                              name: ue.name,
                              bank: ue.bank,
                              number: ue.number,
                              color: ue.color,
                              isFocused: p === Ee,
                              isDimmed: p !== null && p !== Ee,
                              forceResetSwipe: y !== null && y !== Ee,
                              tiltX: he,
                              tiltY: fe,
                              onSwipeStart: () => { Q(); x(Ee); m(null); },
                              onClick: () => { Q(); _("light"); p === Ee ? (_("medium"), r(Ee)) : (m(Ee), x(null)); },
                              onDelete: () => lc(ue.id),
                              onEdit: () => vo(ue)
                            }, ue.id))
                          })
                        ]
                      }),

                      // Nexus AI Insight Highlight Card
                      b.jsxs("div", {
                        className: "desktop-card p-6 relative overflow-hidden border-green-primary/20 bg-gradient-to-br from-green-primary/10 via-white/5 to-transparent",
                        children: [
                          b.jsxs("div", {
                            className: "flex items-center gap-3 mb-3",
                            children: [
                              b.jsx("div", {
                                className: "w-10 h-10 rounded-xl bg-green-primary/20 border border-green-primary/30 flex items-center justify-center text-green-primary shadow-md shadow-green-500/10",
                                children: b.jsx(md, { isTalking: ae || ye, size: 40 })
                              }),
                              b.jsxs("div", {
                                children: [
                                  b.jsx("h4", { className: "text-sm font-bold text-white", children: "Nexus IA Financeira" }),
                                  b.jsx("p", { className: "text-[11px] text-green-primary font-semibold", children: "Online & Sincronizado" })
                                ]
                              })
                            ]
                          }),
                          b.jsx("p", {
                            className: "text-xs text-zinc-300 leading-relaxed mb-4",
                            children: "Seus gastos com alimentação caíram 8% esta semana. Você tem R$ 1.200,00 disponíveis para investimentos recomendados."
                          }),
                          b.jsxs(se.button, {
                            onClick: () => { _("medium"); pe(!0); },
                            whileHover: { scale: 1.02 },
                            whileTap: { scale: 0.98 },
                            className: "w-full py-2.5 px-4 rounded-xl bg-green-primary text-[#05080d] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:brightness-110 transition-all cursor-pointer",
                            children: [
                              b.jsx("span", { children: "Abrir Painel do Nexus IA" }),
                              b.jsx(wu, { size: 14 })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }, "desktop-home") : e === "Statistic" ? b.jsx("div", {
            className: "desktop-screen-fill max-w-5xl mx-auto px-6 py-4",
            children: b.jsx(yne, { onBack: () => t("Home"), isDarkMode: I })
          }, "statistic") : e === "Setting" ? b.jsx("div", {
            className: "desktop-screen-fill max-w-4xl mx-auto px-6 py-4",
            children: b.jsx(vne, {
              userName: C,
              userEmail: k,
              profileImage: V,
              isDarkMode: I,
              onUpdateName: P,
              onUpdateEmail: B,
              onUpdateProfileImage: $,
              onToggleDarkMode: () => H(!I),
              onBack: () => t("Home")
            })
          }, "settings") : b.jsxs("div", {
            className: "desktop-container flex flex-col items-center justify-center min-h-[50vh] text-zinc-400",
            children: [
              b.jsx("div", { className: "w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-green-primary mb-4", children: b.jsx(ag, { size: 40 }) }),
              b.jsx("h3", { className: "text-lg font-bold text-white mb-1", children: "Carteira Digital" }),
              b.jsx("p", { className: "text-sm", children: "Seção de Carteira em breve com gestão de cripto e investimentos." })
            ]
          }, "other")
        })
      ]
    }),

    // 3. Card Details Modal
    b.jsx(jt, {
      children: n !== null && b.jsx(se.div, {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        className: "fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md",
        onClick: () => { r(null); m(null); },
        children: b.jsxs(se.div, {
          initial: { scale: 0.9, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.9, opacity: 0 },
          transition: { type: "spring", damping: 30, stiffness: 300 },
          className: "rounded-[32px] w-full max-w-[440px] p-8 shadow-2xl relative border border-white/10 " + (I ? "bg-[#0d121d]" : "bg-white"),
          onClick: ue => ue.stopPropagation(),
          children: [
            b.jsxs("div", {
              className: "flex justify-between items-center mb-6",
              children: [
                b.jsx("h3", { className: "text-2xl font-bold font-display " + (I ? "text-white" : "text-green-dark"), children: "Detalhes do Cartão" }),
                b.jsx("button", {
                  onClick: () => { r(null); m(null); },
                  className: "p-2 rounded-full " + (I ? "bg-white/5 text-white/40 hover:text-white" : "bg-gray-100 text-gray-400 hover:text-gray-600"),
                  children: b.jsx(io, { size: 20 })
                })
              ]
            }),
            b.jsxs("div", {
              className: oe[n].color + " rounded-2xl p-6 mb-6 text-white shadow-lg",
              children: [
                b.jsx("p", { className: "text-xs opacity-70 mb-1", children: "Número do Cartão" }),
                b.jsx("p", { className: "text-lg font-mono tracking-wider mb-6", children: oe[n].fullNumber }),
                b.jsxs("div", {
                  className: "flex justify-between",
                  children: [
                    b.jsxs("div", {
                      children: [
                        b.jsx("p", { className: "text-xs opacity-70 mb-1", children: "Data de Validade" }),
                        b.jsx("p", { className: "font-mono", children: oe[n].expiry })
                      ]
                    }),
                    b.jsxs("div", {
                      children: [
                        b.jsx("p", { className: "text-xs opacity-70 mb-1", children: "CVV" }),
                        b.jsx("p", { className: "font-mono", children: "***" })
                      ]
                    })
                  ]
                })
              ]
            }),
            b.jsxs("div", {
              className: "space-y-3",
              children: [
                b.jsx("button", { className: "w-full bg-green-primary text-[#05080d] font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/20 active:scale-95 transition-transform cursor-pointer", children: "Copiar Número do Cartão" }),
                b.jsx("button", { className: "w-full border-2 font-bold py-3.5 rounded-xl active:scale-95 transition-transform " + (I ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-100 text-gray-500"), children: "Bloquear Cartão" })
              ]
            })
          ]
        })
      })
    }),

    // 4. Modals (Add Card, Add Transaction, Import, Alerts)
    b.jsx(bne, { isOpen: o || !!u, onClose: () => { s(!1); c(null); }, onSave: wm, editingCard: u, isDarkMode: I }),
    b.jsx(xne, { isOpen: U !== null, onClose: () => ne(null), onSave: yo, type: U || "expense", cards: oe, isDarkMode: I }),
    b.jsx(wne, { isOpen: de, onClose: () => D(!1), onImportComplete: ue => { const Ee = { id: Date.now(), merchant: "Supermercado Atacadão S/A", amount: "-R$ 1.420,00", date: "Hoje, Agora", category: "Compras", type: "expense" }; yo(Ee); }, isDarkMode: I }),
    b.jsx(die, { isOpen: Z, onClose: () => le(!1), isDarkMode: I, transactions: _e, appointments: ce, cards: oe, alerts: ga, onSimulateLowBalance: an, onSimulateLargeTx: xm }),

    // 5. Push Notification Banner
    b.jsx(jt, {
      children: jn && b.jsx(se.div, {
        initial: { y: -120, opacity: 0, scale: 0.9, x: "-50%" },
        animate: { y: 24, opacity: 1, scale: 1, x: "-50%" },
        exit: { y: -120, opacity: 0, scale: 0.9, x: "-50%" },
        transition: { type: "spring", stiffness: 350, damping: 25 },
        onClick: () => { le(!0); ya(null); },
        className: "fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-[420px] cursor-pointer",
        children: b.jsxs("div", {
          className: "p-4 rounded-[26px] shadow-2xl backdrop-blur-3xl border flex items-center gap-3.5 " + (I ? "bg-[#0d121d]/90 text-white border-white/10" : "bg-white/95 text-green-dark border-gray-100"),
          children: [
            b.jsx("div", {
              className: "w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 " + (jn.type === "warning" ? "bg-amber-500/20 text-amber-500" : jn.type === "large_tx" ? "bg-rose-500/20 text-rose-500" : "bg-green-primary/20 text-green-primary"),
              children: jn.type === "warning" ? b.jsx(c5, { size: 20 }) : jn.type === "large_tx" ? b.jsx(wu, { size: 20 }) : b.jsx(Ts, { size: 20 })
            }),
            b.jsxs("div", {
              className: "flex-1 min-w-0",
              children: [
                b.jsxs("div", {
                  className: "flex justify-between items-center",
                  children: [
                    b.jsx("span", { className: "text-[10px] font-black uppercase tracking-widest opacity-40", children: "Notificação Push" }),
                    b.jsx("span", { className: "text-[9px] opacity-40 font-bold uppercase", children: "Agora" })
                  ]
                }),
                b.jsx("h4", { className: "text-[13px] font-bold mt-0.5 truncate leading-tight", children: jn.title }),
                b.jsx("p", { className: "text-[11px] font-medium opacity-60 leading-normal mt-0.5", children: jn.subtitle })
              ]
            })
          ]
        })
      })
    }),

    // 6. Nexus AI Assistant (Slide-Over Drawer on Desktop)
    b.jsx(jt, {
      children: ae && b.jsx(mie, { isOpen: ae, onClose: () => pe(!1), userName: C, isDarkMode: I })
    })
  ]
});
`;

fs.writeFileSync('scratch_desktop_jsx.js', desktopJsxV3);
console.log('Desktop JSX V3 generated successfully!');
