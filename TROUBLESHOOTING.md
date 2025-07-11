# Troubleshooting - Circle Auth Simple

## Erro de Validação de Código

### Sintomas
- O código é enviado por email mas a validação falha
- Mensagem de erro: "Código inválido ou expirado"

### Causas Possíveis

1. **Redis não configurado**
   - Verifique se a variável `REDIS_URL` está definida no `.env.local`
   - Exemplo: `REDIS_URL=redis://localhost:6379`

2. **Redis não está rodando**
   - Inicie o Redis localmente: `redis-server`
   - Ou use um serviço Redis cloud (Redis Cloud, Upstash, etc.)

3. **Problema de conexão com Redis**
   - Verifique os logs do console para mensagens de erro de conexão
   - Teste a conexão: `redis-cli ping`

4. **Código expirado**
   - Os códigos expiram em 10 minutos
   - Solicite um novo código se passou muito tempo

5. **Email com formatação diferente**
   - O sistema normaliza emails para lowercase
   - Certifique-se de usar o mesmo email ao solicitar e verificar

### Como Debugar

1. **Ative os logs detalhados**
   - Os logs foram adicionados em pontos críticos
   - Verifique o console da aplicação

2. **Verifique o Redis**
   ```bash
   # Conecte ao Redis
   redis-cli
   
   # Liste todas as chaves de verificação
   KEYS verification:*
   
   # Veja o conteúdo de uma chave específica
   GET verification:email@example.com
   ```

3. **Logs importantes para verificar**
   - "Generated code for: [email] Code: [código]" - confirma geração
   - "Storage key: verification:[email]" - mostra a chave usada
   - "Code stored successfully" - confirma armazenamento
   - "Looking for key: verification:[email]" - busca do código
   - "Code mismatch" - quando o código não corresponde

### Solução Rápida

1. Certifique-se que o Redis está rodando
2. Verifique se `REDIS_URL` está configurado
3. Reinicie a aplicação
4. Solicite um novo código
5. Use o código imediatamente após recebê-lo

### Configuração de Desenvolvimento

Para desenvolvimento local, use:

```bash
# Instale Redis
brew install redis  # macOS
sudo apt-get install redis-server  # Ubuntu

# Inicie o Redis
redis-server

# Configure no .env.local
REDIS_URL=redis://localhost:6379
```

### Alternativa: Usar Upstash Redis

1. Crie uma conta em https://upstash.com
2. Crie um novo banco Redis
3. Copie a URL de conexão
4. Configure no `.env.local`:
   ```
   REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
   ```