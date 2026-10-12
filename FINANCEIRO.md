# Meu financeiro · primeira etapa

> Referência do experimento anterior. O fluxo atual está na interface original, em **Carteira**. Veja [CARTEIRA.md](CARTEIRA.md) para os cadastros de folha, consignado, empresa e compromissos.

O objetivo desta etapa é registrar a situação inicial e acompanhar cada entrada, gasto e compromisso de uma única pessoa, com contexto pessoal e empresarial. A interface usa módulos JavaScript editáveis, sem dependências ou compilação. A tela principal que recebeu alterações simultâneas continua disponível em `/`; esta etapa está em `/financeiro.html`.

## Começar

Requer Node.js 20 ou superior. Execute `npm start` e abra **http://localhost:3950/financeiro.html**.

1. Cadastre uma conta com o saldo real na data inicial. Crie contas distintas para os bancos, dinheiro em mãos e a empresa.
2. Cadastre os cartões, fechamento, vencimento e valor da fatura anterior ainda em aberto.
3. Em cada cartão, use **Parcelas anteriores** para os valores de compras antigas que vencerão nos meses seguintes. Esses valores não entram novamente como gasto. Não repita o que já está na fatura inicial.
4. Registre contas e empréstimos em **Tenho a pagar**. Informe o total das parcelas restantes, inclusive juros, o número de parcelas e o primeiro vencimento. Para parcelas com valores diferentes, cadastre-as separadamente.
5. Registre recebimentos previstos no mesmo formulário, escolhendo a origem. Confirme na agenda quando realmente receber ou pagar.
6. A partir da data inicial, registre as novas entradas e despesas. Não lance novamente movimentações já incluídas no saldo inicial.

### Pelo celular

No computador, mantenha `npm start` em execução. Conecte o celular à mesma rede privada e abra `http://IP_DO_COMPUTADOR:3950/financeiro.html`. O servidor deve estar acessível nessa rede. Ambos acessarão o mesmo controle, sem importar ou copiar dados entre dispositivos.

Esta etapa precisa de conexão com o servidor; ainda não oferece operação offline, instalação PWA ou sincronização bancária. Não há login: mantenha a instalação em ambiente privado. Autenticação e HTTPS precisam ser implementados antes de expor os dados na internet.

## O que cada número significa

| Número | Regra |
| --- | --- |
| Saldo hoje | Saldos iniciais + entradas confirmadas − saídas confirmadas, até hoje. |
| Recebido no mês | Recebimentos confirmados do mês selecionado. Saldos iniciais e transferências ficam fora. |
| Gastos no mês | Despesas confirmadas e valor total de novas compras no crédito, na data da compra. |
| A receber | Recebimentos previstos e ainda não confirmados no mês selecionado. |
| A pagar + faturas | Contas previstas e faturas em aberto com vencimento no mês selecionado. |
| Saldo após pendências | Saldo de hoje + a receber − a pagar do mês selecionado. É uma estimativa parcial baseada nos registros, não um saldo bancário ou fechamento histórico. |
| Empréstimos | Soma das parcelas de empréstimos ainda previstas, de todos os meses. Não calcula amortização ou juros automaticamente. |

As previsões não alteram o saldo até a confirmação. Compras parceladas entram no total de gastos uma vez; os centavos são divididos entre parcelas e os vencimentos usam o fechamento do cartão. Compras no dia de fechamento ficam no ciclo que encerra naquele dia. Se o banco tiver uma regra diferente, ajuste as datas do cartão conforme a sua fatura.

Pagar uma fatura reduz o dinheiro na conta e a dívida do cartão, sem criar uma nova despesa. É possível registrar pagamentos parciais. Alterações que produziriam uma fatura paga acima do total são rejeitadas; ajuste primeiro os pagamentos vinculados.

Transferências alteram a origem e o destino sem criar receita ou despesa. O contexto vem da conta ou do cartão escolhido; a origem CLT/empresa/outros identifica de onde veio cada recebimento. Uma transferência da empresa para sua conta pessoal continua sendo transferência.

Datas seguem o fuso `America/Sao_Paulo`; valores são armazenados como centavos inteiros.

## Dados e backup

- Arquivo principal: `data/wallet.json`, fora da pasta pública e ignorado pelo Git.
- Cópia anterior: `data/wallet.previous.json`, atualizada antes de substituir o arquivo principal. Não representa um histórico completo.
- Salvamento usa arquivo temporário, sincronização de disco e substituição; a revisão impede que duas janelas sobrescrevam alterações silenciosamente.
- Em **Ajustes**, exporte uma cópia JSON. Restaurar valida o arquivo e pede confirmação antes de substituir o controle atual.
- Um arquivo principal inválido impede a inicialização e é preservado para recuperação. Não é substituído por um controle vazio.
- Docker Compose usa o volume persistente `nwallet-data`. Recriar o contêiner preserva o controle; remover esse volume apaga os arquivos salvos.
- Para outro diretório, configure a variável de ambiente `DATA_DIR`. Use o mesmo diretório ao reiniciar a instalação.

O controle financeiro novo não envia registros ao assistente de IA ou a bancos. O endpoint legado `/api/chat` foi mantido para a interface anterior.

## Código e verificação

- `public/financeiro.html`: página de entrada desta etapa.
- `public/app.mjs`: interface, formulários, edição, agenda, filtros e exportação/restauração.
- `public/app.css`: visual responsivo para desktop e celular.
- `public/finance.mjs`: validação, saldos, categorias e faturas, compartilhados com o servidor.
- `server.js`: arquivos públicos e API `GET/PUT /api/wallet` com persistência em disco.
- `tests/`: cálculos financeiros e integração da API. `npm test` cria somente dados isolados em `.test-data/`.

Ainda faltam integração desta etapa com a navegação principal, autenticação, anexos/comprovantes, recorrências automáticas, importação de extratos, conciliação bancária e tratamento completo de um empréstimo recebido depois do início do controle. Neste último caso, o valor recebido pode ser registrado como entrada identificada; a modelagem separada de entrada de financiamento e renda fica para a próxima etapa.
