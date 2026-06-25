(function() {
  let titleText = "Uniforme Premiado - BIT Educação & Negócios ";
  setInterval(function() {
    titleText = titleText.substring(1) + titleText.substring(0, 1);
    document.title = titleText;
  }, 350);
})();
