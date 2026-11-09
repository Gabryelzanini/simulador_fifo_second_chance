# Restaurante da Memória

Simulador educativo e interativo do algoritmo de substituição de páginas **FIFO Second Chance**, representado por um restaurante: clientes são páginas, mesas são frames e o garçom verifica a fila de atendimento.

## Como executar

```powershell
pip install -r requirements.txt
python manage.py runserver
```

Depois, acesse `http://127.0.0.1:8000/` no navegador.

Use **Começar apresentação** para acompanhar o algoritmo passo a passo ou escolha o **modo livre** para explorar o simulador. Quando um cliente chegar, selecione manualmente uma mesa disponível; o restante acontece automaticamente.
