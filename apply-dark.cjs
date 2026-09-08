const fs = require('fs');
const file = 'src/components/LotteryForm.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  'bg-white': 'bg-white dark:bg-slate-900',
  'text-school-blue-700': 'text-school-blue-700 dark:text-school-blue-300',
  'text-school-blue-600': 'text-school-blue-600 dark:text-school-blue-400',
  'text-school-blue-800': 'text-school-blue-800 dark:text-school-blue-200',
  'bg-school-blue-50': 'bg-school-blue-50 dark:bg-slate-800',
  'border-gray-200': 'border-gray-200 dark:border-slate-700',
  'border-gray-100': 'border-gray-100 dark:border-slate-800',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'bg-red-50': 'bg-red-50 dark:bg-red-950/30',
  'bg-red-100': 'bg-red-100 dark:bg-red-900/40',
  'border-red-100': 'border-red-100 dark:border-red-900/50',
  'border-red-200': 'border-red-200 dark:border-red-800/50',
  'text-red-500': 'text-red-500 dark:text-red-400',
  'text-red-600': 'text-red-600 dark:text-red-400',
  'text-red-700': 'text-red-700 dark:text-red-300',
  'text-red-800': 'text-red-800 dark:text-red-200',
  'bg-[#FFF9D6]': 'bg-[#FFF9D6] dark:bg-yellow-900/30',
  'hover:bg-[#FFF4B3]': 'hover:bg-[#FFF4B3] dark:hover:bg-yellow-800/40',
  'border-yellow-200': 'border-yellow-200 dark:border-yellow-800/50',
  'text-school-yellow-500': 'text-school-yellow-500 dark:text-school-yellow-400',
  'text-school-yellow-600': 'text-school-yellow-600 dark:text-school-yellow-400',
  'border-school-blue-100': 'border-school-blue-100 dark:border-slate-700',
  'border-school-blue-200': 'border-school-blue-200 dark:border-slate-700',
  'border-school-blue-300': 'border-school-blue-300 dark:border-slate-600'
};

Object.keys(replacements).forEach(key => {
  const value = replacements[key];
  const regex = new RegExp(key.replace(/\[/g, '\\\\[').replace(/\]/g, '\\\\]'), 'g');
  // Simple replace since dark: is not there yet.
  content = content.replace(regex, value);
});

fs.writeFileSync(file, content);
console.log('LotteryForm.tsx updated.');
