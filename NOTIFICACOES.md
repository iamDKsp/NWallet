# Notificações do NWallet

Abra **Carteira → Notificações** ou o sino da interface original. A central lista contas em atraso, vencendo hoje e nos próximos sete dias. Inclui pensão paga pela conta, financiamentos, contas fixas ou variáveis, lançamentos previstos e faturas parcialmente pagas. Consignados vinculados à folha não são cobrados novamente.

O resumo push é enviado uma vez por dia em cada aparelho, por padrão às **9h de Brasília**, quando houver contas em atraso, vencendo naquele dia, a um ou três dias do vencimento. Horário, antecedência e aviso diário de atraso podem ser alterados na central. As regras valem para todos os aparelhos; ativar ou desativar um aparelho não interfere nos demais. Registrar o pagamento elimina aquele vencimento dos próximos resumos. Contas variáveis sem valor continuam na central como “Valor a informar”.

## No computador

Abra no Chrome, Edge, Firefox ou Safari compatível, clique em **Ativar neste aparelho** e aceite a permissão do navegador. Use **Enviar teste** para confirmar a entrega. O navegador e o sistema operacional precisam permitir avisos em segundo plano; foco, modo de economia, suspensão do computador e conexão podem atrasar ou impedir a entrega.

## No iPhone

1. Use iOS 16.4 ou posterior e abra o endereço **HTTPS** no Safari.
2. No menu Compartilhar, escolha **Adicionar à Tela de Início**.
3. Abra pelo ícone, entre em **Carteira → Notificações**, toque em **Ativar neste aparelho** e autorize.
4. Toque em **Enviar teste**. Confira também as permissões do NWallet em Ajustes → Notificações.

Abrir uma aba comum ou instalar o site em HTTP não atende aos requisitos de push do iPhone. A exceção de `localhost` permite desenvolvimento no próprio computador; o endereço HTTP da rede local não tem essa exceção no telefone.

## Publicação no Portainer

Publique estes arquivos com a imagem reconstruída: há uma dependência nova, `web-push`. O Dockerfile usa `npm ci` e inclui `notifications.cjs`. Mantenha o volume `nwallet-data` existente: nele ficam os dados financeiros e `notifications.json`, com as chaves VAPID, inscrições dos aparelhos, regras e controle do último envio. **Não apague o volume para atualizar.**

Configure certificado válido e HTTPS no proxy do domínio `nwallet.teltech.com.br`. No container, pode definir `VAPID_SUBJECT=https://nwallet.teltech.com.br` como contato do serviço. O servidor HTTP interno pode continuar na porta 3950 atrás do proxy HTTPS.

O processo Node precisa permanecer ativo. O agendador verifica os compromissos a cada minuto e, após uma reinicialização, verifica o dia atual. Não envia resumos antigos acumulados. Um envio aceito pelo provedor é considerado enviado naquele dia; a entrega final depende do aparelho. Inscrições expiradas são removidas e falhas transitórias são tentadas novamente em quinze minutos. Várias réplicas do mesmo servidor sobre o mesmo volume não são suportadas: use um único container.

Nenhum pagamento é feito por uma notificação. Os avisos externos mostram apenas quantidades, sem nomes ou valores; os detalhes ficam na Carteira. O service worker recebe push e abre a central ao tocar no aviso, sem armazenar em cache páginas ou dados financeiros.

Fontes: [Apple Web Push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [WebKit: apps na Tela de Início](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
