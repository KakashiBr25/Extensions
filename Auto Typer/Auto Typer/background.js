chrome.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === "updateProgress") {
        // Enviar a atualização da barra de progresso ao popup
        chrome.action.setBadgeText({ tabId: sender.tab.id, text: `${Math.round(message.value)}%` });
    }
});
