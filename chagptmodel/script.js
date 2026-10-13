
/* =====================================
   COGNIFY AI - CHATBOT FUNCTIONALITY
===================================== */

// Select important HTML elements
const conversation = document.getElementById("conversation");
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatHistory = document.getElementById("chatHistory");
const searchChats = document.getElementById("searchChats");
const sendBtn = document.getElementById("sendBtn");
const toast = document.getElementById("toast");

// Application data
let chats = [];
let activeChatId = null;
let replyTimer = null;
let toastTimer = null;

// Load saved data from the browser
try {
    chats = JSON.parse(localStorage.getItem("cognifyChats")) || [];
    if (!Array.isArray(chats)) chats = [];
} catch (error) {
    chats = [];
}

try {
    if (localStorage.getItem("cognifyTheme") === "dark") {
        document.body.classList.add("dark");
    }
} catch (error) {
    // The app can still run if browser storage is unavailable.
}

// Give every conversation a unique ID
function makeId() {
    return Date.now().toString() +
        Math.random().toString(36).slice(2, 7);
}

// Save chats and appearance in browser storage
function saveChats() {
    try {
        localStorage.setItem("cognifyChats", JSON.stringify(chats));
    } catch (error) {
        showToast("Could not save chats in this browser.");
    }
}

// Show a small notification
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
        toast.classList.remove("show");
    }, 2200);
}

// Find the currently selected conversation
function getActiveChat() {
    return chats.find(function (chat) {
        return chat.id === activeChatId;
    });
}

// Create a new conversation
function createChat() {
    clearTimeout(replyTimer);
    sendBtn.disabled = false;

    const chat = {
        id: makeId(),
        title: "New chat",
        messages: []
    };

    chats.unshift(chat);
    activeChatId = chat.id;

    saveChats();
    renderHistory();
    renderMessages();

    userInput.value = "";
    userInput.style.height = "auto";
    userInput.focus();

    closeSidebarOnMobile();
}

// Update a chat title using its first message
function updateChatTitle(chat, text) {
    if (chat.title === "New chat") {
        chat.title = text.length > 35
            ? text.slice(0, 35) + "..."
            : text;
    }
}

// Draw the conversation list in the sidebar
function renderHistory() {
    chatHistory.replaceChildren();

    const query = searchChats.value.toLowerCase().trim();

    const filteredChats = chats.filter(function (chat) {
        const titleMatches = chat.title.toLowerCase().includes(query);

        const messageMatches = chat.messages.some(function (message) {
            return message.text.toLowerCase().includes(query);
        });

        return titleMatches || messageMatches;
    });

    if (filteredChats.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-history";
        empty.textContent = query
            ? "No matching conversations."
            : "Your conversations will appear here.";
        chatHistory.appendChild(empty);
        return;
    }

    filteredChats.forEach(function (chat) {
        const item = document.createElement("div");
        item.className = "history-item";

        if (chat.id === activeChatId) {
            item.classList.add("active");
        }

        const openButton = document.createElement("button");
        openButton.className = "history-open";
        openButton.textContent = chat.title;
        openButton.title = chat.title;
        openButton.dataset.action = "open";
        openButton.dataset.id = chat.id;

        const actions = document.createElement("div");
        actions.className = "history-actions";

        const renameButton = document.createElement("button");
        renameButton.className = "history-action";
        renameButton.textContent = "✎";
        renameButton.title = "Rename conversation";
        renameButton.dataset.action = "rename";
        renameButton.dataset.id = chat.id;

        const deleteButton = document.createElement("button");
        deleteButton.className = "history-action";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete conversation";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = chat.id;

        actions.appendChild(renameButton);
        actions.appendChild(deleteButton);

        item.appendChild(openButton);
        item.appendChild(actions);

        chatHistory.appendChild(item);
    });
}

// Switch to an existing conversation
function openChat(id) {
    if (!chats.some(function (chat) {
        return chat.id === id;
    })) {
        return;
    }

    clearTimeout(replyTimer);
    sendBtn.disabled = false;

    activeChatId = id;

    renderHistory();
    renderMessages();
    userInput.value = "";
    userInput.style.height = "auto";

    closeSidebarOnMobile();
}

// Display messages for the selected conversation
function renderMessages() {
    messages.replaceChildren();

    const chat = getActiveChat();

    if (!chat || chat.messages.length === 0) {
        welcome.hidden = false;
    } else {
        welcome.hidden = true;

        chat.messages.forEach(function (message) {
            displayMessage(message);
        });
    }

    conversation.scrollTop = conversation.scrollHeight;
}

// Create a message bubble safely
function displayMessage(message) {
    const row = document.createElement("div");
    row.className = "message-row " + message.sender;

    if (message.sender === "bot") {
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "✦";
        row.appendChild(avatar);
    }

    const body = document.createElement("div");
    body.className = "message-body";

    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = message.sender === "user"
        ? "You"
        : "Cognify AI";

    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = message.text;

    body.appendChild(name);
    body.appendChild(text);

    // Add copy and regenerate controls to bot messages
    if (message.sender === "bot") {
        const tools = document.createElement("div");
        tools.className = "message-tools";

        const copyButton = document.createElement("button");
        copyButton.textContent = "▢ Copy";
        copyButton.dataset.action = "copy";
        copyButton.dataset.text = message.text;
        copyButton.title = "Copy this response";

        const retryButton = document.createElement("button");
        retryButton.textContent = "↻ Retry";
        retryButton.dataset.action = "retry";
        retryButton.dataset.id = message.id;
        retryButton.title = "Generate another demo response";

        tools.appendChild(copyButton);
        tools.appendChild(retryButton);
        body.appendChild(tools);
    }

    row.appendChild(body);

    if (message.sender === "user") {
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "Y";
        row.appendChild(avatar);
    }

    messages.appendChild(row);
}

// Generate a response using simple keyword rules
function getReply(input) {
    const text = input.toLowerCase().trim();
    const mode = document.getElementById("modelSelect").value;

    let answer = "";

    if (/\b(hi|hello|hey)\b/.test(text)) {
        answer = "Hello! 👋 Welcome to Cognify AI. What would you like to explore today?";
    } else if (text.includes("your name") || text.includes("who are you")) {
        answer = "I'm Cognify AI, a chatbot demonstration built with HTML, CSS and JavaScript.";
    } else if (text.includes("html")) {
        answer = "HTML stands for HyperText Markup Language. It creates the structure of a webpage using elements such as headings, paragraphs, links, images and forms.\n\nFor example:\n<h1>Hello World</h1>\n<p>Welcome to my website.</p>";
    } else if (text.includes("css")) {
        answer = "CSS stands for Cascading Style Sheets. It controls how a webpage looks, including its colors, fonts, spacing, borders and layout.\n\nFor example:\ncolor: blue;\nbackground-color: white;";
    } else if (text.includes("javascript") || text.includes("java script")) {
        answer = "JavaScript adds interactivity to webpages. It can respond to button clicks, validate forms, update content and change HTML elements through the DOM.";
    } else if (text.includes("dom")) {
        answer = "DOM stands for Document Object Model. It represents the webpage as objects that JavaScript can select, create, modify or remove.\n\nExample:\ndocument.getElementById('title');";
    } else if (text.includes("github") || /\bgit\b/.test(text)) {
        answer = "Git tracks changes in your code. GitHub is an online platform where you can store Git repositories, share projects and collaborate with others.";
    } else if (text.includes("cloud computing") || text.includes("cloud")) {
        answer = "Cloud computing provides computing services such as storage, servers and software over the internet. It lets users access resources without managing all the physical hardware themselves.";
    } else if (text.includes("study plan") || text.includes("timetable")) {
        answer = "Here is a simple study plan:\n\n1. Spend 25 minutes learning one topic.\n2. Take a 5-minute break.\n3. Practice questions for 25 minutes.\n4. Review mistakes for 10 minutes.\n5. Revise key points before sleeping.\n\nAdjust the timings to your schedule.";
    } else if (text.includes("project") || text.includes("ideas")) {
        answer = "Here are some college project ideas:\n\n1. Student task planner\n2. Expense tracker\n3. Quiz application\n4. Weather dashboard using an API\n5. AI-style chatbot\n\nStart with a small working version, then add features.";
    } else if (text.includes("joke") || text.includes("funny")) {
        answer = "Why do programmers prefer dark mode? Because light attracts bugs! 😄";
    } else if (text.includes("time complexity")) {
        answer = "Time complexity describes how an algorithm's running time grows as its input grows. Common examples include O(1), O(log n), O(n) and O(n²).";
    } else if (text.includes("thank")) {
        answer = "You're welcome! 😊 I'm happy to help. What else would you like to explore?";
    } else if (text.includes("help")) {
        answer = "You can ask me about HTML, CSS, JavaScript, DOM, Git, GitHub, cloud computing, programming or study planning. Try one of the suggested prompts too!";
    } else if (text.includes("what is") || text.startsWith("explain ")) {
        answer = "I can explain some common web development topics, but my demo knowledge is limited. Try asking about HTML, CSS, JavaScript, the DOM, Git or cloud computing.";
    } else {
        answer = "That's an interesting question! I'm a demo chatbot and don't have a live AI model connected. Try asking about HTML, CSS, JavaScript, the DOM, Git or cloud computing.";
    }

    // Adjust the length of supported answers
    if (mode === "simple") {
        const firstParagraph = answer.split("\n\n")[0];
        return firstParagraph;
    }

    if (mode === "detailed") {
        return answer + "\n\nTip: Try a specific follow-up question to explore this topic further.";
    }

    return answer;
}

// Send a message and show a simulated reply
function sendMessage(text) {
    text = text.trim();

    if (!text || sendBtn.disabled) {
        return;
    }

    let chat = getActiveChat();

    if (!chat) {
        createChat();
        chat = getActiveChat();
    }

    clearTimeout(replyTimer);

    updateChatTitle(chat, text);

    chat.messages.push({
        id: makeId(),
        sender: "user",
        text: text
    });

    saveChats();
    renderHistory();
    renderMessages();

    userInput.value = "";
    userInput.style.height = "auto";
    sendBtn.disabled = true;

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.textContent = "Cognify is thinking...";
    messages.appendChild(typing);

    conversation.scrollTop = conversation.scrollHeight;

    const requestChatId = activeChatId;

    replyTimer = setTimeout(function () {
        typing.remove();

        // Don't put a delayed reply into another conversation
        if (activeChatId !== requestChatId) {
            sendBtn.disabled = false;
            return;
        }

        const currentChat = getActiveChat();

        if (!currentChat) {
            sendBtn.disabled = false;
            return;
        }

        currentChat.messages.push({
            id: makeId(),
            sender: "bot",
            text: getReply(text)
        });

        saveChats();
        renderHistory();
        renderMessages();

        sendBtn.disabled = false;
        userInput.focus();
    }, 650);
}

// Submit the form
chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(userInput.value);
});

// Automatically grow the message box
userInput.addEventListener("input", function () {
    userInput.style.height = "auto";
    userInput.style.height =
        Math.min(userInput.scrollHeight, 160) + "px";
});

// Enter sends; Shift + Enter adds a new line
userInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (!sendBtn.disabled) {
            chatForm.requestSubmit();
        }
    }
});

// Click on a suggested prompt
conversation.addEventListener("click", function (event) {
    const promptButton = event.target.closest("[data-prompt]");

    if (promptButton) {
        sendMessage(promptButton.dataset.prompt);
    }
});

// Handle history actions and message controls
document.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "open") {
        openChat(id);
    }

    if (action === "rename") {
        const chat = chats.find(function (item) {
            return item.id === id;
        });

        if (chat) {
            const newTitle = prompt("Enter a new chat title:", chat.title);

            if (newTitle && newTitle.trim()) {
                chat.title = newTitle.trim().slice(0, 60);
                saveChats();
                renderHistory();
            }
        }
    }

    if (action === "delete") {
        const confirmed = confirm("Delete this conversation?");

        if (confirmed) {
            chats = chats.filter(function (chat) {
                return chat.id !== id;
            });

            if (activeChatId === id) {
                clearTimeout(replyTimer);
                sendBtn.disabled = false;
                activeChatId = null;
            }

            saveChats();

            if (!activeChatId && chats.length > 0) {
                activeChatId = chats[0].id;
            }

            renderHistory();
            renderMessages();
        }
    }

    if (action === "copy") {
        try {
            await navigator.clipboard.writeText(button.dataset.text);
            showToast("Response copied!");
        } catch (error) {
            showToast("Copy unavailable. Select and copy the text manually.");
        }
    }

    if (action === "retry") {
        const chat = getActiveChat();

        if (!chat || sendBtn.disabled) return;

        const index = chat.messages.findIndex(function (message) {
            return message.id === id && message.sender === "bot";
        });

        if (index < 0 || index === 0) return;

        const previousUserMessage = chat.messages
            .slice(0, index)
            .reverse()
            .find(function (message) {
                return message.sender === "user";
            });

        if (!previousUserMessage) return;

        chat.messages.splice(index, 1);

        saveChats();
        renderMessages();

        const typing = document.createElement("div");
        typing.className = "typing";
        typing.textContent = "Cognify is thinking...";
        messages.appendChild(typing);

        sendBtn.disabled = true;

        const retryChatId = activeChatId;

        replyTimer = setTimeout(function () {
            typing.remove();

            if (activeChatId === retryChatId) {
                const currentChat = getActiveChat();

                if (currentChat) {
                    currentChat.messages.push({
                        id: makeId(),
                        sender: "bot",
                        text: getReply(previousUserMessage.text)
                    });

                    saveChats();
                    renderMessages();
                }
            }

            sendBtn.disabled = false;
        }, 650);
    }
});

// New conversation
document.getElementById("newChat").addEventListener("click", function () {
    createChat();
});

// Clear messages in the current conversation
document.getElementById("clearChat").addEventListener("click", function () {
    const chat = getActiveChat();

    if (!chat || chat.messages.length === 0) {
        showToast("This conversation is already empty.");
        return;
    }

    if (!confirm("Clear all messages in this conversation?")) {
        return;
    }

    clearTimeout(replyTimer);
    sendBtn.disabled = false;

    chat.messages = [];
    chat.title = "New chat";

    saveChats();
    renderHistory();
    renderMessages();

    showToast("Conversation cleared.");
});

// Search chat titles and message contents
searchChats.addEventListener("input", renderHistory);

// Switch between light and dark themes
document.getElementById("themeToggle").addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    document.getElementById("themeIcon").textContent =
        isDark ? "☾" : "☼";

    document.getElementById("themeLabel").textContent =
        isDark ? "Dark appearance" : "Light appearance";

    try {
        localStorage.setItem("cognifyTheme", isDark ? "dark" : "light");
    } catch (error) {
        // Theme still works until the page is closed.
    }
});

// Export the active conversation as a text file
document.getElementById("exportChat").addEventListener("click", function () {
    const chat = getActiveChat();

    if (!chat || chat.messages.length === 0) {
        showToast("There are no messages to export.");
        return;
    }

    const content = chat.messages.map(function (message) {
        const sender = message.sender === "user" ? "You" : "Cognify AI";
        return sender + ":\n" + message.text;
    }).join("\n\n--------------------\n\n");

    const file = new Blob(
        ["Cognify AI Conversation\n\n" + content],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = chat.title.replace(/[\\/:*?"<>|]/g, "_") + ".txt";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("Conversation exported.");
});

// Mobile sidebar controls
document.getElementById("openSidebar").addEventListener("click", function () {
    document.getElementById("sidebar").classList.add("open");
});

document.getElementById("closeSidebar").addEventListener("click", function () {
    document.getElementById("sidebar").classList.remove("open");
});

function closeSidebarOnMobile() {
    if (window.innerWidth <= 700) {
        document.getElementById("sidebar").classList.remove("open");
    }
}

// Initialize the application
function initializeApp() {
    document.getElementById("themeIcon").textContent =
        document.body.classList.contains("dark") ? "☾" : "☼";

    document.getElementById("themeLabel").textContent =
        document.body.classList.contains("dark")
            ? "Dark appearance"
            : "Light appearance";

    if (chats.length > 0) {
        activeChatId = chats[0].id;
    } else {
        createChat();
        return;
    }

    renderHistory();
    renderMessages();
}

initializeApp();
