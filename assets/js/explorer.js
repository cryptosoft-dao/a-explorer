"use strict";

const explorer = {};

explorer.utils = {};
explorer.address = {};

explorer.utils.get_ton_price = async () => {
  const json = await fetch("https://api.coingecko.com/api/v3/coins/the-open-network/market_chart?days=2&interval=daily&vs_currency=USD&precision=4");
  const data = await json.json();
  return data.prices[2][1];
}

explorer.utils.time_ago = (timestamp) => {
  //should return amount of time passed from last activity. for example:
  return "10 years ago";
}

explorer.utils.num2str = (n) => {
  return n.toLocaleString("en-US");
}

explorer.utils.round = (n,p=0) => {
  var f = Math.pow(10,p);
  return Math.round(n*f)/f;
}

explorer.utils.crc16 = (data) => {
  const poly = 0x1021;
  let reg = 0;
  const message = new Uint8Array(data.length + 2);
  message.set(data);
  for (let byte of message) {
    let mask = 0x80;
    while (mask > 0) {
      reg <<= 1;
      if (byte & mask) {
        reg += 1;
      }
      mask >>= 1
      if (reg > 0xffff) {
        reg &= 0xffff;
        reg ^= poly;
      }
    }
  }
  return new Uint8Array([Math.floor(reg / 256), reg % 256]);
}

explorer.address.raw2friendly = (hex, bounceable = 1, testnet = 0) => {
  try {
    const workchain = parseInt(hex.split(":")[0]);
    hex = hex.split(":")[1];
    let bytes = [testnet ? 0x91 : bounceable ? 0x11 : 0x51, workchain ? 0xFF : 0x00];
    for (let i = 0; i < 32; i++) bytes.push(+("0x" + hex[i * 2] + hex[i * 2 + 1]));
    const crc = explorer.utils.crc16(bytes.slice(0, 34));
    bytes.push(crc[0],crc[1]);
    return btoa(String.fromCodePoint(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
  } catch (error) {
    throw new Error("Failed to parse address :(");
  }
}

explorer.address.friendly2raw = (input) => {
  try {
    let bytes = new Uint8Array([...atob(input.replace(/-/g, "+").replace(/_/g, "/"))].map(c => c.charCodeAt(0)));
    const workchain = bytes[1]==0xFF?"-1":"0";
    //const bounceable = (bytes[0] & 0x10) === 0x10;
    //const testnet = (bytes[0] & 0x80) === 0x80;
    const hex = bytes.slice(2, 34).reduce((acc, val) => acc + val.toString(16).padStart(2, "0"), "");
    const crc = explorer.utils.crc16(bytes.slice(0, 34));
    const crcMatch = crc[0] === bytes[34] && crc[1] === bytes[35];
    if (crcMatch) {
      return `${workchain}:${hex}`;
    } else {
      throw new Error("Failed to parse address :(");
    }
  } catch (error) {
    throw new Error("Failed to parse address :(");
  }
}

explorer.address.parse = (input) => {
  const address = {};
  try {
    if (input.length == 48) {
      //--input is friendly address--//
      address.raw = explorer.address.friendly2raw(input);
      if (input.substr(0,2) == "EQ") {
        //--input is bounceable address--//
        address.bounceable = input;
        address.non_bounceable = explorer.address.raw2friendly(address.raw,0,0);
      } else {
        //--input is non_bounceable address--//
        address.bounceable = explorer.address.raw2friendly(address.raw,1,0);
        address.non_bounceable = input;
      }
    } else {
      //--input is raw address--//
      address.raw = input;
      address.bounceable = explorer.address.raw2friendly(address.raw,1,0);
      address.non_bounceable = explorer.address.raw2friendly(address.raw,0,0);
    }
    return address;
  } catch (error) {
    throw new Error("Failed to parse address :(");
  }
}

explorer.address.get = async (address) => {
  try {
    const json = await fetch(`https://tonapi.io/v2/accounts/${address.raw}`);
    const data = await json.json();
    return data;
  } catch (error) {
    throw new Error("Failed to fetch data :(");
  }
}

explorer.init = async (input) => {
  const content = document.querySelector(".explorer .content");
  const ton_price = await explorer.utils.get_ton_price();
  const address = explorer.address.parse(input);
  const address_data = await explorer.address.get(address);
  switch(address_data.interfaces[0]) {
    case "wallet_v4r2":
      content.innerHTML = `
        <div class="name">Address</div>
        ${address.bounceable}
        <hr>
        <div class="name">Balance</div>
        ${address_data.balance/1e9} ≈ ${explorer.utils.round(address_data.balance/1e9*ton_price,2)}
        <hr>
        <div class="name">Contract Type</div>
        ${address_data.interfaces[0]}
        <hr>
        <div class="name">State</div>
        ${address_data.status}
        <hr>
        <div class="name">Last activity</div>
        ${explorer.utils.time_ago(address_data.last_activity)}
      `;
      break;
    case 'case2':
      break;
  }
}