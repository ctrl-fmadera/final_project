import { useContext, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import Avatar from "./Avatar.jsx";
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [groupChats, setGroupChats] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [allUsers, setAllUsers] = useState({}); // userId -> username map
  const { username, id, setId, setUsername } = useContext(UserContext);
  const divUnderMessages = useRef();

  // Connect WebSocket
  useEffect(() => {
    connectToWs();
    // eslint-disable-next-line
  }, []);

  // Fetch group chats when user logs in or after group creation
  useEffect(() => {
    if (id) {
      axios.get('/groupchats').then(res => {
        setGroupChats(res.data);
      }).catch(() => setGroupChats([]));
    }
  }, [id]);

  // Fetch all users for mapping sender IDs to usernames
  useEffect(() => {
    if (id) {
      axios.get('/people').then(res => {
        const map = {};
        res.data.forEach(u => { map[u._id] = u.username; });
        setAllUsers(map);
      });
    }
  }, [id]);

  // Load messages when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) return;
    axios.get('/messages/' + selectedUserId).then(res => {
      setMessages(res.data);
    }).catch(() => setMessages([]));
  }, [selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Fetch offline people (users not online)
  useEffect(() => {
    axios.get('/people').then(res => {
      const offline = res.data.filter(p => p._id !== id && !Object.keys(onlinePeople).includes(p._id));
      const offlineMap = {};
      offline.forEach(p => offlineMap[p._id] = p);
      setOfflinePeople(offlineMap);
    });
  }, [onlinePeople, id]);

  // WebSocket connection and handlers
  function connectToWs() {
    const ws = new WebSocket('ws://localhost:4000');
    setWs(ws);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('close', () => {
      setTimeout(() => {
        connectToWs();
      }, 1000);
    });
  }

  function handleMessage(ev) {
    const data = JSON.parse(ev.data);
    if ('online' in data) {
      const onlineMap = {};
      data.online.forEach(({ userId, username }) => {
        onlineMap[userId] = username;
      });
      setOnlinePeople(onlineMap);
    } else if ('text' in data) {
      setMessages(prev => [...prev, data]);
      setIsTyping(false);
    } else if ('typing' in data) {
      setIsTyping(data.typing);
      setTypingUserId(data.userId);
    }
  }

  // Logout
  function logout() {
    axios.post('/logout').then(() => {
      setWs(null);
      setId(null);
      setUsername(null);
    });
  }

  // Send message (text or file)
  function sendMessage(ev, file = null) {
    if (ev) ev.preventDefault();
    if (!newMessageText.trim() && !file) return; // prevent empty messages
    ws.send(JSON.stringify({
      recipient: selectedUserId,
      text: newMessageText,
      file,
    }));
    setNewMessageText('');
    setMessages(prev => ([...prev, {
      text: newMessageText,
      sender: id,
      recipient: selectedUserId,
      _id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
    }]));
  }

  // Send file handler
  function sendFile(ev) {
    const reader = new FileReader();
    reader.readAsDataURL(ev.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: ev.target.files[0].name,
        data: reader.result,
      });
    };
  }

  // Typing indicator
  const handleTyping = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ typing: true, recipient: selectedUserId, userId: id }));
    setIsTyping(true);
  };

  // Edit message
  const editMessage = (messageId) => {
    const newText = prompt("Edit your message:");
    if (newText) {
      const updatedMessages = messages.map(m => m._id === messageId ? { ...m, text: newText } : m);
      setMessages(updatedMessages);
      ws.send(JSON.stringify({ type: 'edit', messageId, text: newText }));
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    setMessages(messages.filter(m => m._id !== messageId));
    await axios.delete(`/messages/${messageId}`);
    ws.send(JSON.stringify({ type: 'delete', messageId }));
  };

  // View user profile
  const viewProfile = (userId) => {
    setProfileUser(offlinePeople[userId] || onlinePeople[userId]);
    setShowProfile(true);
  };

  // Create group chat and refresh group list
  const createGroupChat = async () => {
    const groupName = prompt("Enter group chat name:");
    if (!groupName) return;
    const selectedMembers = prompt("Enter usernames to add to the group chat, separated by commas:");
    if (selectedMembers) {
      const membersArray = selectedMembers.split(',').map(u => u.trim());
      try {
        const response = await axios.post('/groupchat', { name: groupName, members: membersArray });
        if (response.data?.groupId) {
          // Refresh group chats and select new group
          const groupsResponse = await axios.get('/groupchats');
          setGroupChats(groupsResponse.data);
          setSelectedUserId(response.data.groupId);
        }
      } catch (error) {
        alert('Failed to create group chat');
      }
    }
  };

  // Prepare online people excluding self
  const onlinePeopleExclSelf = { ...onlinePeople };
  delete onlinePeopleExclSelf[id];

  // Remove duplicate messages
  const messagesWithoutDupes = uniqBy(messages, '_id');

  return (
    <div className="flex h-screen bg-white text-black">
      <div className="bg-white w-1/3 flex flex-col">
        <div className="flex-grow">
          <Logo />
          <input
            type="text"
            placeholder="Search user..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="border rounded p-2 mb-2"
          />
          {/* Group Chats */}
          {groupChats.length > 0 && (
            <div className="mb-2">
              <div className="font-bold text-xs text-gray-500 pl-2">Group Chats</div>
              {groupChats.map(group => (
                <Contact
                  key={group._id}
                  id={group._id}
                  online={false}
                  username={group.name}
                  onClick={() => setSelectedUserId(group._id)}
                  selected={group._id === selectedUserId}
                  isGroup={true}
                />
              ))}
            </div>
          )}
          {/* Search Results */}
          {searchResults.length > 0 ? (
            searchResults.map(user => (
              <Contact
                key={user._id}
                id={user._id}
                online={false}
                username={user.username}
                onClick={() => setSelectedUserId(user._id)}
                selected={user._id === selectedUserId}
              />
            ))
          ) : (
            searchInput && <div className="text-red-500">User does not exist</div>
          )}
          {/* Online Users */}
          {Object.keys(onlinePeopleExclSelf).map(userId => (
            <Contact
              key={userId}
              id={userId}
              online={true}
              username={onlinePeopleExclSelf[userId]}
              onClick={() => { setSelectedUserId(userId); viewProfile(userId); }}
              selected={userId === selectedUserId}
            />
          ))}
          {/* Offline Users */}
          {Object.keys(offlinePeople).map(userId => (
            <Contact
              key={userId}
              id={userId}
              online={false}
              username={offlinePeople[userId].username}
              onClick={() => { setSelectedUserId(userId); viewProfile(userId); }}
              selected={userId === selectedUserId}
            />
          ))}
        </div>
        <div className="p-2 text-center flex items-center justify-center">
          <span className="mr-2 text-sm text-gray-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            {username}
          </span>
          <button
            onClick={logout}
            className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm">logout</button>
          <button
            onClick={createGroupChat}
            className="text-sm bg-green-100 py-1 px-2 text-gray-500 border rounded-sm ml-2">Create Group Chat</button>
        </div>
      </div>
      <div className="flex flex-col bg-blue-50 w-2/3 p-1">
        <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full flex-grow items-center justify-center">
              <div className="text-gray-300">&larr; Select a person or group from the sidebar</div>
            </div>
          )}
          {!!selectedUserId && (
            <div className="relative h-full">
              <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                {messagesWithoutDupes.map(message => (
                  <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                    {/* Sender's name above the bubble */}
                    <div
                      className="text-xs font-bold text-gray-600 mb-1"
                      style={{ marginLeft: message.sender === id ? 'auto' : 0, width: 'fit-content' }}
                    >
                      {allUsers[message.sender] || (message.sender === id ? '(You)' : message.sender)}
                    </div>
                    <div className={"text-left inline-block p-2 my-2 rounded-md text-sm " + (message.sender === id ? 'bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                      <span>{message.text}</span>
                      {message.file && (
                        <div>
                          <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
                            </svg>
                            {message.file}
                          </a>
                        </div>
                      )}
                      {message.sender === id && (
                        <div className="flex justify-between mt-1">
                          <button onClick={() => editMessage(message._id)} className="text-white">Edit</button>
                          <button onClick={() => deleteMessage(message._id)} className="text-red-500">Delete</button>
                        </div>
                      )}
                      <div className="text-xs text-white-400 mt-1">{message.timestamp}</div>
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages}></div>
              </div>
            </div>
          )}
        </div>
        {!!selectedUserId && (
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input type="text"
              value={newMessageText}
              onChange={ev => {
                setNewMessageText(ev.target.value);
                handleTyping();
              }}
              placeholder="Type your message here"
              className="bg-white flex-grow border rounded-sm p-2" />
            <label className="bg-blue-200 p-2 text-gray-600 cursor-pointer rounded-sm border border-blue-200">
              <input type="file" className="hidden" onChange={sendFile} />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
              </svg>
            </label>
            <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && profileUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <h2 className="text-lg font-bold">{profileUser.username}'s Profile</h2>
            <p>User ID: {profileUser._id}</p>
            <p>Status: {onlinePeople[profileUser._id] ? 'Online' : 'Offline'}</p>
            <button onClick={() => setShowProfile(false)} className="mt-4 bg-blue-500 text-white py-1 px-2 rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
