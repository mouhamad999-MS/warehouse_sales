// Initialize theme from localStorage
const theme = localStorage.getItem('theme') ?? 'light';
document.documentElement.classList.toggle('dark', theme === 'dark');
