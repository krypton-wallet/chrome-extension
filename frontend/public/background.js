import {
  Keypair,
} from "@solana/web3.js";
import bs58 from "bs58";

const responseHandlers = new Map();

const handleConnect = async (message, sender, sendResponse) => {
  chrome.storage.sync.get(["sk"]).then(async (result) => {
    if (result.sk == undefined) {
      console.log("sk not found");
      return;
    }
    const callback = async (data, id) => {
      await sendResponse(data, id);
    };
    const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
    await callback({
      method: "connected",
      params: {
        publicKey: currKeypair.publicKey,
      },
      id: message.data.id,
    });
  });
};

const handleDisconnect = async (message, sender, sendResponse) => {
  await sendResponse({ method: "disconnected", id: message.data.id });
};

const launchPopup = async (message, sender, sendResponse) => {
  const searchParams = {};
  searchParams.origin = sender.origin;
  searchParams.request = JSON.stringify(message.data);
  if (message.data.params?.network) {
    searchParams.network = message.data.params.network;
  }

  chrome.windows.getLastFocused(async (focusedWindow) => {
    await chrome.storage.sync.set({ searchParams: searchParams });
    const popup = await chrome.windows.create({
      url: "adapter/" + message.data.method +".html",
      type: "popup",
      width: 450,
      height: 650,
      top: focusedWindow.top,
      left: focusedWindow.left + (focusedWindow.width - 450),
      focused: true,
    });

    const listener = windowId => {
      if (windowId === popup.id) {
        const responseHandler = responseHandlers.get(message.data.id);
        if (responseHandler) {
          responseHandlers.delete(message.data.id);
          responseHandler({
            error: 'Operation cancelled',
            id: message.data.id,
          });
        }
        chrome.windows.onRemoved.removeListener(listener);
      }
    };
    chrome.windows.onRemoved.addListener(listener);
  });

  responseHandlers.set(message.data.id, sendResponse);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    return;
  }

  if (message.channel === "solmate_contentscript_background_channel") {
    if (message.data.method === "connect") {
      handleConnect(message, sender, sendResponse);
    } else if (message.data.method === "disconnect") {
      handleDisconnect(message, sender, sendResponse);
    } else {
      launchPopup(message, sender, sendResponse);
    }
    // keeps response channel open
    return true;
  } else if (message.channel === "salmon_extension_background_channel") {
    const responseHandler = responseHandlers.get(message.data.id);
    responseHandlers.delete(message.data.id);
    responseHandler(message.data, message.data.id);
  }
});