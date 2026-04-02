# Quita App — Vite + React

O Duolingo das Finanças. Migrado de `index.html` único para estrutura modular.

## Estrutura

```
src/
├── main.jsx                  # Entrada Vite
├── styles/global.css         # CSS global + canvas 3D
├── services/
│   ├── supabase.js           # Cliente Supabase
│   ├── lessons.json          # Lições estáticas (futuro: tabela `lessons`)
│   └── gameConfig.js         # Constantes do jogo
├── three/
│   └── scene.js              # Motor Three.js: Quita + Diorama + Moeda
├── hooks/
│   └── useQuitaScene.js      # Hook React ↔ Three.js
└── components/
    ├── Root.jsx               # Auth + session
    ├── AuthScreen.jsx
    ├── QuitaApp.jsx           # App principal + Home + Lesson + Goals + Profile
    ├── TrilhaScreen.jsx
    ├── ExpensesScreen.jsx
    ├── ReceitasScreen.jsx
    ├── DebtsScreen.jsx
    ├── DebtCard.jsx
    ├── PlanejamentoScreen.jsx
    └── DiagnosticoScreen.jsx
```

## Setup local

```bash
npm install
npm run dev
```

## Deploy (Vercel)

1. Push para GitHub
2. Conectar repositório no Vercel
3. Adicionar variável de ambiente: `ANTHROPIC_API_KEY`
4. Deploy automático a cada push

## Lições estáticas → Supabase (pós-MVP)

Em `src/services/lessons.json` estão as 5 lições atuais.  
Para migrar ao banco, criar tabela `lessons` com colunas:
- `id int, order_index int, title, subtitle, xp, theme, content, highlight jsonb, questions jsonb`

E substituir o import em `QuitaApp.jsx`:
```js
// Atual (estático)
import LESSONS from '../services/lessons.json'

// Futuro (Supabase)
const { data: LESSONS } = await sb.from('lessons').select('*').order('order_index')
```
