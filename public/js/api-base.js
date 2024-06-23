// Basic check, can't really do much more because it's a public file
const getApiBaseUrl = () => {
  if (window.location.hostname === 'localhost') {
    return '/api';
  }
  
  return 'https://darrenskidmore.com/gng-calculator/api';
};

export { getApiBaseUrl };