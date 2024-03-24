
address_input.addEventListener("keydown",(event)=>{
  if (event.key === "Enter") {
    explorer.init(address_input.value);
  }
});
/* for testing
explorer.init("UQDuW9GLQyxAcV6pcBYn0v7Hujg8im_RDQNDjPJCNSo9pUh8");
*/