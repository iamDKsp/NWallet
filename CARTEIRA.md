# Carteira do NWallet

O financeiro está dentro da interface original: abra `http://localhost:3950/` e entre em **Carteira**. O painel começa sem dados de demonstração; cada cadastro e confirmação é salvo no servidor.

## Configurar sua realidade

1. **Contas:** crie uma conta pessoal para receber seu salário e uma conta separada para a empresa. Informe os saldos iniciais e suas datas. Registre apenas movimentações que ainda não estão incluídas nesses saldos.
2. **CLT e folha:** cadastre o trabalho, o salário antes dos descontos que você vai informar, a conta de recebimento e o dia de pagamento. Escolha a primeira competência a acompanhar.
3. **Adicionar desconto:** informe INSS/impostos conforme sua folha, outros descontos ou pensão descontada na folha. Valores podem ser fixos ou percentuais do salário informado, com primeira e última competência opcionais. Não são usadas tabelas legais de cálculo.
4. **Vincular consignado:** cadastre o contrato, o valor da parcela, quantas parcelas ainda faltam, a primeira data restante e a folha vinculada.
5. **Confirmar salário recebido:** confira o salário dessa competência e o líquido previsto. O sistema deposita somente o líquido na conta e baixa o consignado da competência. Os descontos não viram uma segunda saída da conta.
6. **Compromissos:** cadastre financiamentos, empréstimos pagos pela conta, pensão paga fora da folha e recorrências. Para cada recorrência, escolha valor fixo ou variável, conta, vencimento e período.
7. **Empresa:** o cartão da conta mostra quanto ainda está na empresa. Registre recebimentos de clientes e despesas. Use **Retirar para mim** para transferir para sua conta pessoal; o resumo mostra as retiradas do mês, sem duplicar a receita.

Se seu salário já faz parte do saldo inicial, não confirme esse recebimento novamente. Você pode iniciar a folha na próxima competência e informar apenas as parcelas que ainda faltam no consignado.

## Compromissos e confirmações

Previsões ficam fora do saldo. Elas são geradas a partir dos cadastros quando você consulta uma competência. Gastos variáveis sem valor aparecem como **Valor a informar**; não são tratados como uma despesa conhecida de zero reais.

Ao confirmar uma conta variável, informe o valor real. A competência de cada recorrência ou contrato só pode ser confirmada uma vez. Descontos de consignado são confirmados pelo recebimento da folha, e não pelo botão de pagamento de uma despesa.

As folhas confirmadas guardam uma cópia do salário e dos descontos daquele mês. Mudar o salário ou os descontos para competências futuras mantém o histórico confirmado. Excluir um recebimento de salário em **Registros** reabre os consignados associados a essa folha.

As parcelas de contratos são mensais e de valor igual, com as informações que você fornecer. **Total a pagar** é a soma das parcelas restantes, incluindo os juros já contidos na parcela. Não é um cálculo de saldo devedor principal, quitação antecipada ou amortização. Depois de confirmar parcelas, o parcelamento fica protegido contra alterações que quebrariam o histórico.

Pensão pode ser um desconto da folha ou uma recorrência paga pela conta. Cadastre a forma que realmente se aplica a cada obrigação para evitar duplicidade.

## Receitas, despesas, cartões e gráficos

Os formulários originais de Receita e Despesa agora permitem selecionar conta, origem CLT/empresa/outros, categoria e pagamento por Pix, débito, dinheiro, boleto, transferência ou crédito. Para salário com consignado e outros descontos, prefira a confirmação da folha.

Uma compra no crédito entra nos gastos pelo valor total e distribui parcelas entre as faturas. O dinheiro sai da conta somente no pagamento da fatura. Configure fechamento, vencimento e a fatura anterior em **Contas → Configurar cartões existentes**. O pagamento da fatura não gera outra despesa.

Transferências movem os dois saldos e ficam fora dos totais de receitas/despesas. Os descontos da folha aparecem no detalhamento do CLT: o recebimento utilizado no saldo e nas estatísticas é o líquido. O salário bruto e os descontos não são somados novamente como movimentações bancárias.

O calendário original recebe os registros reais e os compromissos previstos. As estatísticas financeiras refletem os registros da competência atual; os controles antigos de períodos/metas ainda precisam de uma revisão funcional própria.

## Persistência e desenvolvimento

- O controle fica em `data/wallet.json`. A versão anterior fica em `data/wallet.previous.json`.
- Datas financeiras seguem `America/Sao_Paulo`; valores são centavos inteiros.
- A revisão da API impede sobrescrita silenciosa por outra janela.
- Docker Compose mantém o diretório em volume persistente.
- A instalação ainda requer conexão com o servidor e acesso privado; autenticação não faz parte desta etapa.
- `public/finance.mjs` valida os dados e calcula saldos/faturas.
- `public/planning.mjs` calcula folha, vínculos, competências, contratos e recorrências.
- `public/assets/finance-integration.mjs` reutiliza o React e os componentes da interface original.
- `public/assets/finance-integration.css` aplica o estilo das novas opções dentro da identidade existente.
- `scripts/integrate_finance.js` conecta os módulos ao bundle original. Se o bundle for regenerado pelos scripts antigos, esta integração precisa ser reaplicada; o script recusa estruturas inesperadas.
- `npm test` usa somente dados isolados em `.test-data/`.

O antigo experimento em `/financeiro.html` não é a interface principal. A Carteira original é o fluxo atual.
