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

## Contas bancárias e cartões vinculados

Informe o banco / instituição no cadastro da conta bancária. Após salvar, use **Adicionar cartão a esta conta**; essa opção também aparece na lista de cartões dentro da conta. Uma conta pode ter vários cartões físicos, virtuais ou adicionais.

O cartão recebe automaticamente o banco e o contexto Pessoal/Empresa da conta vinculada. Alterar o banco ou o contexto da conta atualiza essa identificação nos cartões. Dinheiro em mãos não pode ter cartões vinculados. É preciso desvincular os cartões antes de transformar uma conta bancária em dinheiro em mãos ou excluir a conta.

Os cartões anteriores permanecem disponíveis em **Contas → Cartões sem conta vinculada → Editar / vincular**. Cartões independentes podem continuar sem vínculo. Esse vínculo identifica a conta bancária à qual o cartão pertence; a conta usada para pagar uma fatura continua sendo escolhida no pagamento.

## Receitas, despesas, cartões e gráficos

Os formulários originais de Receita e Despesa agora permitem selecionar conta, origem CLT/empresa/outros, categoria e pagamento por Pix, débito, dinheiro, boleto, transferência ou crédito. Para salário com consignado e outros descontos, prefira a confirmação da folha.

Uma compra no crédito entra nos gastos pelo valor total e distribui parcelas entre as faturas. O dinheiro sai da conta somente no pagamento da fatura. Configure fechamento, vencimento e a fatura anterior ao editar o cartão, na opção **Fechamento, vencimento e fatura inicial**. O pagamento da fatura não gera outra despesa.

Transferências movem os dois saldos e ficam fora dos totais de receitas/despesas. Os descontos da folha aparecem no detalhamento do CLT: o recebimento utilizado no saldo e nas estatísticas é o líquido. O salário bruto e os descontos não são somados novamente como movimentações bancárias.

Carteira e Estatísticas compartilham a competência selecionada. Estatísticas permite consultar os últimos sete dias da competência, o mês ou o ano, com séries calculadas pelos lançamentos confirmados. Transferências e pagamentos de fatura não viram despesas nesses gráficos. Meses vazios mostram um aviso, sem curvas de demonstração. O saldo exibido continua sendo o saldo atual, mesmo ao consultar registros de outra competência.

A previsão de pagamentos da competência reúne compromissos pagos pela conta e faturas pendentes. Consignados ficam no salário líquido, sem uma segunda saída. O resumo distingue saídas já realizadas, valores ainda a pagar e compromissos sem valor informado. Em Contas, **Composição da fatura** mostra os saldos/parcelas que compõem o total e os pagamentos confirmados.

Em **Dívidas & Juros**, os totais separam parcelas restantes, cotações de quitação informadas, faturas abertas e saldos negativos atuais. Faturas aparecem com seu vencimento e estado A vencer/Vence hoje/Em atraso; não recebem taxa presumida de rotativo. O simulador ignora parcelas confirmadas, identifica a taxa usada e a competência de referência e apresenta uma estimativa mensal, que não substitui uma cotação do credor. Cotações inconsistentes com as parcelas geram avisos e não são alteradas automaticamente.

### Estatísticas: cartões, faturas e limites

As melhorias ficam em **Estatísticas**, nas abas **Resumo do mês** e **Cartões e faturas**, mantendo o visual do Início. O resumo tem um atalho para analisar o crédito. A aba de cartões mostra:

- Fatura da competência, pagamentos registrados, fechamento e vencimento.
- Limite total informado, valor comprometido, percentual utilizado e disponível estimado por cartão.
- Faturas da competência ou todas em aberto, com filtro por cartão. Expanda uma fatura para conferir composição e pagamentos por data.
- Faturas já cadastradas nos próximos seis meses, com valores por cartão.
- Cheque especial em uma área própria, calculado pelo saldo negativo atual da conta e separado dos cartões.

O comprometimento do cartão soma todas as faturas abertas, incluindo parcelas futuras. Pagamentos confirmados reduzem esse comprometimento. O disponível estimado é o limite informado menos o comprometimento, com mínimo zero por cartão; um excesso em outro cartão não consome o limite independente que ainda resta neste. Valores acima do limite geram um aviso de conferência. Essa estimativa não substitui o limite disponível informado pelo banco, pois depende dos registros e das regras de liberação/encargos.

Use **Editar limite** diretamente em Estatísticas, ou o campo de limite no cadastro do cartão. Limite desconhecido aparece como **Não informado**; zero é um limite válido. Alterar um limite não altera compras, faturas, pagamentos ou saldos bancários.

Os limites confirmados pelo usuário são Santander SX R$ 100,00, Nubank R$ 1.800,00 e BB Ourocard R$ 5.000,00. No próximo deploy, o servidor inicializa somente o campo ausente dos cartões correspondentes, com backup e revisão. Valores já configurados, inclusive zero ou explicitamente não informado, são preservados em deploys posteriores. O cheque especial Santander de R$ 2.000,00 permanece separado.

## Gastos por categoria

Abra **Ver gastos por categoria** no cartão de saldo. O painel soma somente despesas confirmadas no mês escolhido, com opção de separar **Pessoal** e **Empresa**. Compras no crédito entram pelo valor total na data da compra; o pagamento da fatura, transferências entre suas contas, receitas e despesas previstas não são somados aos gastos. As categorias são as que foram informadas nos lançamentos.

Use as setas para consultar meses anteriores ou futuros, ou **Atual** para voltar ao mês corrente. Toque em uma categoria para conferir os lançamentos que compõem o valor, com data, forma de pagamento e conta/cartão. Os detalhes são paginados em cinco registros. Os percentuais arredondados somam 100%, e o destaque informa a categoria de maior participação, sem usar limites ou orçamentos não cadastrados. Meses sem gastos mostram R$ 0,00 e um estado vazio, sem valores de demonstração. A seção **Pagamentos previstos** mostra separadamente faturas e compromissos pendentes, com datas e valores, respeitando o contexto selecionado.

## Agenda de compromissos

Use **Minha agenda** no início para chegar ao calendário. No celular, a semana mostra sete dias sem arrastar; no desktop, o mês e os eventos do dia ficam lado a lado. Alterne entre **Semana**, **Mês** e **Agenda**, use **Hoje**, as setas ou o seletor de mês para navegar. A lista **Agenda** agrupa os eventos do mês por data.

Cadastre um compromisso com título, data, horário opcional, categoria, local e observações. Ele fica salvo no servidor, junto com os demais dados, e entra na exportação do controle. Você pode editar, concluir ou reabrir um compromisso e excluir com a opção de **Desfazer**. Compromissos podem repetir semanal ou mensalmente, com data final opcional. A conclusão é por ocorrência; edição e exclusão alteram a série inteira. Quando o mês não tem o dia original, a repetição mensal usa o último dia e retoma o dia original no mês seguinte.

Mesmo quando o dia selecionado não tem eventos, **Próximos compromissos · 30 dias** exibe até dez próximos itens, com data e valor quando houver. Toque no item para selecionar seu dia. O painel do dia continua mostrando somente os eventos da data selecionada.

Filtre os eventos por compromissos, financeiro ou aniversários. **Concluídos** mostra os compromissos pessoais já finalizados. Faturas, previsões e movimentações financeiras aparecem com seus valores; abra os detalhes para acessar a seção correspondente da carteira. Concluir um compromisso pessoal não altera saldos ou confirma pagamentos. Eventos sem horário informado não recebem um horário inventado.

## Aniversários e agendamentos especiais

Acesse **Carteira → Aniversários** ou o atalho na Visão Geral. Cadastre amigos, familiares e contatos:
- **Foto:** upload da câmera ou fototeca com compressão automática em Canvas (~15-20 KB), salvo diretamente no estado do wallet.
- **Nome e data de nascimento:** cálculo automático de anos a completar e contagem regressiva de dias.
- **Avisos no iPhone:** escolha de lembretes automáticos com 1 mês (30 dias), 1 semana (7 dias), 3 dias e no dia do aniversário.
- **Parabéns no WhatsApp:** atalho direto com 1 clique para felicitações com mensagem pronta.
- **Integração com a Agenda:** aniversários aparecem no calendário do sistema com o ícone 🎂.

## Carrinho e compras futuras

Acesse **Carteira → Carrinho** ou o atalho rápido no Início. O módulo permite planejar e acompanhar compras futuras (wishlist/carrinho de compras planejadas):
- **Itens com foto:** upload direto da câmera ou fototeca com compressão automática em Canvas (~20 KB), ou link direto para imagem.
- **Link para compra:** salva a URL da loja ou produto, com atalho direto em 1 clique ("Abrir link") em nova aba.
- **Valor estimado e métricas:** acompanhamento instantâneo do valor total a comprar (pendente), valor já comprado e total geral planejado.
- **Dar baixa como comprado:** botão direto no card do produto para alternar entre "A comprar" e "Comprado" (com data da baixa) ou reabrir a qualquer momento.
- **Lançar gasto:** atalho prático para registrar o item diretamente como despesa confirmada no financeiro da Carteira.
- **Filtros e busca:** visualização rápida por "Todos", "A comprar (pendentes)" e "Comprados", além de pesquisa textual em tempo real, categorias e prioridades (Alta, Média, Baixa).
- **CRUD completo:** crie, edite dados e fotos, ou exclua itens a qualquer momento.

## Persistência e desenvolvimento

- O controle fica em `data/wallet.json`. A versão anterior fica em `data/wallet.previous.json`.
- Datas financeiras seguem `America/Sao_Paulo`; valores são centavos inteiros.
- A revisão da API impede sobrescrita silenciosa por outra janela.
- Docker Compose mantém o diretório em volume persistente.
- A instalação ainda requer conexão com o servidor e acesso privado; autenticação não faz parte desta etapa.
- `public/finance.mjs` valida os dados e calcula saldos/faturas.
- `public/planning.mjs` calcula folha, vínculos, competências, contratos e recorrências.
- `public/agenda.mjs` valida compromissos e calcula repetições, datas e filtros da agenda.
- `public/assets/calendar-ui.mjs` e `calendar.css` implementam o calendário responsivo e seus formulários.
- `public/assets/finance-integration.mjs` reutiliza o React e os componentes da interface original.
- `public/assets/finance-integration.css` aplica o estilo das novas opções dentro da identidade existente.
- `scripts/integrate_finance.js` conecta os módulos ao bundle original. Se o bundle for regenerado pelos scripts antigos, esta integração precisa ser reaplicada; o script recusa estruturas inesperadas.
- `npm test` usa somente dados isolados em `.test-data/`.

O antigo experimento em `/financeiro.html` não é a interface principal. A Carteira original é o fluxo atual.

### Visual original das Estatísticas

O resumo reutiliza as barras animadas, as ondas decorativas, o gráfico circular interativo e as linhas de despesas do visual original. As alturas e as fatias vêm dos registros confirmados do período escolhido (semana, mês ou ano), sem valores demonstrativos. A previsão inclui faturas e compromissos; a barra de pagamentos representa o percentual efetivamente pago.

A atividade mantém busca por descrição ou valor, filtros de datas, faixa de valores e método de pagamento, paginação e alteração de categoria das despesas. A aba **Cartões e faturas** permanece disponível. A preparação da interface no deploy preserva a conexão com os componentes originais, sem alterar o visual do Início.

### Seleção de cartão e extrato

Em **Cartões e faturas**, os cartões reutilizam a aparência e a inclinação do Início. Um clique ou Enter/Espaço abre os limites e o extrato do cartão; outro clique recolhe. Nessa seleção, as faturas e a projeção de seis meses também ficam filtradas para o cartão escolhido. As ações de arrastar para editar/excluir continuam no Início e ficam desabilitadas nesta seleção.

O extrato mostra todo o histórico cadastrado para o cartão, com busca, tipo de registro, datas e paginação. Cada compra confirmada aparece uma vez pelo valor total; suas parcelas e vencimentos ficam nos detalhes. Os pagamentos são registros separados. Os saldos e as parcelas anteriores aparecem com seu vencimento, sem inventar a data da compra, sua categoria ou sua composição. Os registros confirmados recentes vêm primeiro, seguidos dos saldos anteriores futuros em ordem de vencimento. Os totais do cabeçalho representam todo o histórico cadastrado, enquanto os filtros afetam a lista.

Os atalhos **CLT e folha**, **Minha empresa** e **Aniversários** do Início abrem diretamente **CLT e folha**, **Empresa** e **Aniversários** na Carteira. **Minha agenda** continua levando ao calendário da tela inicial.
