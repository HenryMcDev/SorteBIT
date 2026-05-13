const fs = require('fs');
const file = 'src/components/LotteryForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Contêiner principal do cartão: bg-white dark:bg-slate-900 -> bg-white dark:bg-zinc-950 border-0 dark:border dark:border-zinc-800
content = content.replace(/border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950/g, 'border-0 bg-white dark:bg-slate-900'); // Revert first just in case
content = content.replace(/border-0 bg-white dark:bg-slate-900/g, 'border-0 dark:border dark:border-zinc-800 bg-white dark:bg-zinc-950');
content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-zinc-950');

// 2. Títulos: text-white. Currently they are 'text-school-blue-700 dark:text-school-blue-300' or similar
content = content.replace(/dark:text-school-blue-300/g, 'dark:text-white');
content = content.replace(/dark:text-school-blue-200/g, 'dark:text-white');

// 3. Textos de apoio ou parágrafos informativos: text-zinc-400
content = content.replace(/dark:text-gray-300/g, 'dark:text-zinc-400');
content = content.replace(/dark:text-gray-400/g, 'dark:text-zinc-400'); // Some are gray-400
content = content.replace(/dark:text-school-blue-400/g, 'dark:text-zinc-400');
content = content.replace(/dark:text-white\/80/g, 'dark:text-zinc-400/80'); 
content = content.replace(/dark:text-school-blue-300\/80/g, 'dark:text-zinc-400/80');

// 4. Rótulos de formulário: text-zinc-200
content = content.replace(/<Label ([^>]+) className="([^"]+) dark:text-white/g, '<Label $1 className="$2 dark:text-zinc-200');

// 5. Componentes de input: bg-zinc-900, border-zinc-700, text-white
content = content.replace(/border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl/g, 'border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl');
content = content.replace(/border-gray-200 dark:border-slate-700 focus:border-school-blue-500 rounded-xl font-mono/g, 'border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-white focus:border-school-blue-500 rounded-xl font-mono');

// 6. Botões de ação secundária: bg-zinc-800 com text-zinc-100
content = content.replace(/bg-school-blue-600 hover:bg-school-blue-700 text-white/g, 'bg-school-blue-600 hover:bg-school-blue-700 text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700');

fs.writeFileSync(file, content);
console.log('Changes applied to LotteryForm.tsx');
