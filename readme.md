
Full-Stack Chat Application Documentation
By Frances Yvonne P. Madera
_________________________________________________________________________________________

**Project Overview**

The purpose of this application is to provide a platform for users to communicate in real-time 
through chat functionalities. Users can log in, sign up, create group chats, and manage their 
messages effectively.

**Main Features**

    - User authentication (Sign up and Log in)
    - Group chat creation and management (Edit group chat name)
    - Message management (edit and delete messages)
    - User search functionality
_________________________________________________________________________________________
    
**Technologies Used**

a. MongoDB, which was used for storing user and chat data
b. Express.js, the web framework for Node.js to build the backend API
c. React, the frontend for building user interfaces
d. Node.js, the JavaScript runtime for server-side development
e. Vite, build and development tool server for modern web applications
f. Yarn, package manager for managing project dependencies
    
    Additional libraries:

      a. Axios, for making HTTP requests from the frontend
      b. Mongoose, ODM for MongoDB to manage data models
      c. Bootstrap, for responsive design and UI components
      d. bcryptjs, for hasing passwords
      e. jsonwebtoken, for handling authentication tokes
      f. cookie-parser, for parsing cookies in requests
      g. cors, for enabling Cross-Origin Resource Sharing
      h. ws, for WebSocket communication
      i. Tailwind CSS, the CSS framework for styling.
      j. Lodash, for utility functions
_________________________________________________________________________________________

**Setup Instructions**

  `Cloning the repository`
      git clone <https://github.com/dejwid/mern-chat>
      cd <final_project>

  `Installing dependencies`
      for the backend:
        cd api 
        npm install

      for the frontend:
        cd client
        npm install

  `Setting up environment variables`
    create a .env file in api
    in the file, type in:
        MONGO_URL=mongodb+srv://fmadera:2003.fmadera@csdc105madera.jsluytw.mongodb.net/
        JWT_SECRET=mySuperSecretKey
        CLIENT_URL=http://localhost:5173

  `Starting the backend and fronted server`
      for the backend:
        cd api 
        npm run dev

      for the frontend:
        cd client
        yarn dev
        ctrl + click on the localhost link
_________________________________________________________________________________________

**Folder Structure**

  `for the backend ('api' folder):`
    a. models, which contains data models for GroupChat, Message, and User.
    b. node_modules, which contains all npm packages.
    c. .env, the environment variables for the application.
    d. index.js, which is the main entry point for the backend server.
    e. package.json, contains the project metadata and dependencies.
    f. yarn.lock, the dependency lock file.

  `for the frontend ('client' folder):`
    a. node_modules, which contains all npm packages.
    b. public and assets, which contains static files and assets (includes Vite logo).
    c. src, which contains all source code.
        jsx files, which contains the react components and pages (e.g., RegisterLogin.jsx, Chat.jsx).
    d. package.json, the project metadata and dependencies.
    e. postcss.config.cjs, the configuration file for PostCSS.
    f. tailwind.config.cjs, the configuration file for Tailwind CSS.
    g. vite.config.js, the configuration file for Vite.
    h. yarn.lock, the dependency lock file.
_________________________________________________________________________________________

**Code Explanation**

`Main Added Features`

    a. User Authentication (Sign Up and Log In)
        Implemented in the `RegisterLogin.jsx` component:  
            - Manages both registration and login forms with controlled inputs for username, email, password, and other user details.  
            - Performs validation (e.g., password confirmation during registration).  
            - Sends requests to the backend API endpoints `/register` and `/login` via Axios to create new accounts or authenticate users.  
            - Updates global user context on successful login or registration.

    ```javascript
        async function handleSubmit(ev) {
            ev.preventDefault();
            if (isLoginOrRegister === 'register') {
                if (password !== confirmPassword) {
                    alert("Passwords do not match!");
                    return;
                }
                const { data } = await axios.post('http://localhost:4000/register', { username, password, email, mobileNumber, birthday });
                if (data.id) {
                    setLoggedInUsername(username);
                    setId(data.id);
                }
            } else {
                const { data } = await axios.post('http://localhost:4000/login', { usernameOrEmail, password });
                if (data.username && data.id) {
                    setLoggedInUsername(data.username);
                    setId(data.id);
                }
            }
        }
    ```

    b. Group Chat Creation and Management (Including Edit Group Chat Name)  
        Enabled within the `Chat.jsx` component:  
            - Users can create group chats by entering a group name and adding members.  
            - The component posts new group chat data to `/groupchat`.  
            - After creation, group chat lists refresh to include the new group.  
            - Editing group chat names can be integrated similarly by sending update requests to the backend.

    ```javascript
        const createGroupChat = async () => {
            const groupName = prompt("Enter group chat name:");
            if (!groupName) return;
            const selectedMembers = prompt("Enter usernames to add to the group chat, separated by commas:");
            if (selectedMembers) {
                const membersArray = selectedMembers.split(',').map(u => u.trim());
                const response = await axios.post('/groupchat', { name: groupName, members: membersArray });
                if (response.data?.groupId) {
                const groupsResponse = await axios.get('/groupchats');
                setGroupChats(groupsResponse.data);
                setSelectedUser Id(response.data.groupId);
                }
            }
            };
    ```

    c. Message Management (Edit and Delete Messages)
        Implemented in the `Chat.jsx` component as well:  
            - Users can edit messages by triggering a prompt, which updates the local message state and informs the server via WebSocket.  
            - Users can delete messages; this removes it from local state, sends a delete request to the backend, and broadcasts deletion via WebSocket.  

    ```javascript
    const editMessage = (messageId) => {
        const newText = prompt("Edit your message:");
        if (newText) {
            const updatedMessages = messages.map(m => m._id === messageId ? { ...m, text: newText } : m);
            setMessages(updatedMessages);
            ws.send(JSON.stringify({ type: 'edit', messageId, text: newText }));
        }
        };

        const deleteMessage = async (messageId) => {
        setMessages(messages.filter(m => m._id !== messageId));
        await axios.delete(`/messages/${messageId}`);
        ws.send(JSON.stringify({ type: 'delete', messageId })); 
        };
    ```

    d. User  Search Functionality
        Managed in the `Chat.jsx` component:  
            - A search input allows users to type usernames to find other users.  
            - The search results are displayed dynamically; when users are found, they can be selected to start messaging or included in group chats.  
            - If no matching user exists, a "User does not exist" message is shown.

    ```javascript
        <input
            type="text"
            placeholder="Search user..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="border rounded p-2 mb-2"
            />
            
        {searchResults.length > 0 ? (searchResults.map(user => (
            <Contact
            key={user._id}
            id={user._id}                
            online={false}
            username={user.username}
            onClick={() => setSelectedUser Id(user._id)}
            selected={user._id === selectedUser Id}
            />
        ))
        ) : (searchInput && <div className="text-red-500">User  does not exist</div>
        )
    }
    ```

`Backend Breakdown`

    a. API Routes
        The backend API is defined in `index.js` and includes various routes for user authentication, message handling, and group chat management.

   - **User  Registration**: 
     ```javascript
     app.post('/register', async (req, res) => {
     });
     ```

   - **User  Login**: 
     ```javascript
     app.post('/login', async (req, res) => {
     });
     ```

   - **Fetch Messages**: 
     ```javascript
     app.get('/messages/:id', async (req, res) => {
     });
     ```

   - **Group Chat Management**: 
     ```javascript
     app.post('/groupchat', async (req, res) => {
     });
     ```

2. **Database Models**  
   The application uses Mongoose models for `User `, `Message`, and `GroupChat`. Each model defines the schema for the respective data structure.

   - User Model: Contains fields for username, password, email, etc.
   - Message Model: Contains fields for sender, recipient, text, and file.
   - GroupChat Model: Contains fields for group name and members.

_________________________________________________________________________________________

**Challenges Faced**

During the development of this project, I encountered several challenges, including:

a. Understanding the intricacies of WebSocket communication for real-time messaging.
b. Implementing user authentication securely.
c. Managing state effectively in the React application. 

These challenges were resolved through the use useful educational materials 
found in the web. Check for the references below.
_________________________________________________________________________________________

**Future Improvements**

Potential features or improvements for the application include:

a. Adding user authentication with OAuth (e.g., Google, Facebook).
b. Improving the user interface for a better user experience.
c. Implementing notifications for new messages.
d. Adding more features and a better design for the display profile.
e. Adding a Settings function to edit and delete existing account.
_________________________________________________________________________________________

**Screenshots**

REGISTER
![alt text](image-2.png) 

LOGIN
![alt text](image-3.png)

HOMEPAGE
![alt text](image.png)

USER PROFILE
![alt text](image-1.png)

CHAT MESSAGE
![alt text](image-4.png)

GROUPCHATS
![alt text](image-5.png)
_________________________________________________________________________________________

References
https://www.w3schools.com/REACT/DEFAULT.ASP
https://www.geeksforgeeks.org/how-to-secure-your-websocket-connections/
https://www.mongodb.com/docs/cloud-manager/tutorial/connect-to-mongodb/