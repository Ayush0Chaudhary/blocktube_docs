(function () {
  'use strict';

  const utils = {
    // TODO: write the reason of the fucntion
    sendStorage() {
      console.log(globalStorage);
      window.postMessage({
        from: 'BLOCKTUBE_CONTENT',
        // type define kiya h bas, extra backchodi, dont know if important
        type: 'storageData',
        // jo bhi availbale h as data bhje do
        
        data: compiledStorage || globalStorage,
        // this below line is saying the similar port ko hi bhejna, kisi ko bhi mat bhej dena
      }, document.location.origin);
    },

    // to inject inject.js script at the end of this function, 
    inject() {
      // create a <script> tag
      const s = document.createElement('script');
      // is element ka src = inject.js rakhdi (<script src="inject.js"> </script>) 
      // the inject.js file in same directory level btw
      // The script file is retrieved using the chrome.extension.getURL() method to ensure it's accessible within the extension.
      s.src = chrome.extension.getURL('src/scripts/inject.js');
      
      // when the script is loaded. pe ready() function run krr rha h.
      s.onload = events.ready;
      // async false matlab, jabtak script load nhi ho jaati, page render nhi hoga
      s.async = false;

      // script is added to the end of the dom, maybe it want to check the render the dom(NOT SURE)
      (document.head || document.documentElement).appendChild(s);
    },

    sendReload(msg, duration) {
      window.postMessage({
        from: 'BLOCKTUBE_CONTENT',
        type: 'reloadRequired',
        data: {msg, duration}
      }, document.location.origin);
    }
  };


  // this code block checks whether the <body> element of the HTML document exists. 
  // If it does, it sends a reload message using the utils.sendReload() function and then immediately exits the IIFE function. 
  // This mechanism is often used to handle cases where the content script needs to 
  // take specific actions based on whether the page's DOM has been fully loaded and parsed.
  if (document.body) {
    utils.sendReload();
    return;
  }


  // this just add a script with textcontent = {seed_contetn} and set async to false, and added ti the top, dont know what it does 
  //
  // Inject seed(OWner comment)
  const seed = document.createElement('script');
  seed.textContent = `
  {SEED_CONTENTS}
  `;
  seed.async = false;
  (document.head || document.documentElement).prepend(seed);

  let globalStorage;
  let compiledStorage;
  let ready = false;
  let port = null;

  // set and get function of this extension, 
  const storage = {
    set(data) {
      chrome.storage.local.set({ storageData: data });
    },
    get(cb) {
      chrome.storage.local.get('storageData', (storageRes) => {
        cb(storageRes.storageData);
      });
    },
  };

  const events = {
    // This method is likely called when a context menu item is used to block content
    contextBlock(data) {
      
      // entries array that includes a comment indicating the blocked content's context menu source, 
      // followed by the IDs of the blocked content.
      const entries = [`// Blocked by context menu (${data.info.text})`];
      
      // this code snippet checks if data.info.id is an array. 
      // If it is an array, it returns data.info.id as-is. 
      // If it's not an array, it wraps data.info.id in a new array [data.info.id]. 
      // This ensures that the result is always an array, whether or not data.info.id was originally an array or a single value.
      const id = Array.isArray(data.info.id) ? 
      data.info.id : [data.info.id];
      
      // const sourceArray = [1, 2, 3];
      // const newArray = [...sourceArray, 4, 5];
      // newArray = [1, 2, 3, 4, 5]
      entries.push(...id);
      entries.push('');

      // new data value push spread krdi global storage :)
      globalStorage.filterData[data.type].push(...entries);
      
      // Storage update krdi
      storage.set(globalStorage);
    },
    ready() {

      // updated storage send krdi
      utils.sendStorage();
      
      // ready flag ture krdiya when inject.js load ho jati h
      ready = true;
    },
  };

  function connectToPort() {
    port = chrome.runtime.connect();
    // Listen for messages from background page
    port.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'filtersData': {
          if (msg.data) {
            globalStorage = msg.data.storage;
            compiledStorage = msg.data.compiledStorage;
          }
          if (ready) utils.sendStorage();
          break;
        }
        default:
          break;
      }
    });

    // Reload page on extension update/uninstall
    port.onDisconnect.addListener(() => {
      port = null;
      utils.sendReload();
    });
  }

  connectToPort();

  // Listen for messages from injected page script
  window.addEventListener('message', (event) => {

    // This check ensures that the message source is the same as the current window. 
    // If not, it returns early, effectively ignoring the message. 
    // This is a security measure to prevent messages from untrusted sources.
    if (event.source !== window) return;

    // check verifies that the message has a from property, and its value is 'BLOCKTUBE_PAGE'. 
    // If this condition is not met, the function returns early, further filtering out unwanted messages.
    if (!event.data.from || event.data.from !== 'BLOCKTUBE_PAGE') return;

    switch (event.data.type) {

      // If the incoming message has 'contextBlockData' type, it calls events.contextBlock(event.data.data);  
      // yeh sent maybe when the menu context se add krte h blocked video etc
      case 'contextBlockData': {
        events.contextBlock(event.data.data);
        break;
      }
      default:
        break;
    }
  }, true);

  // Inject script to page
  utils.inject();
}());
