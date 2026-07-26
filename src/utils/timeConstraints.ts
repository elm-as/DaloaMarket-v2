export const isCurfewActive = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  const timeInMinutes = hours * 60 + minutes;
  const startCurfew = 22 * 60 + 30; // 22:30 (1350 minutes)
  const endCurfew = 5 * 60 + 30; // 05:30 (330 minutes)
  
  return timeInMinutes >= startCurfew || timeInMinutes < endCurfew;
};
