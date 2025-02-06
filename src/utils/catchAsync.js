// Async fonksiyonları try-catch bloğuna alan yardımcı fonksiyon
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}; 