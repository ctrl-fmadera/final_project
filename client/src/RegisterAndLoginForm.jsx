import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext.jsx";

export default function RegisterAndLoginForm() {
  const [usernameOrEmail, setUsernameOrEmail] = useState(''); 
  const [username, setUsername] = useState('');  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');  
  const [mobileNumber, setMobileNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  async function handleSubmit(ev) {
    ev.preventDefault();

    if (isLoginOrRegister === 'register') {
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      const url = 'register';
      const payload = { username, password, email, mobileNumber, birthday };
      const { data } = await axios.post(url, payload);
      setLoggedInUsername(username);
      setId(data.id);
    } else {
      const url = 'login';
      const payload = { usernameOrEmail, password };
      const { data } = await axios.post(url, payload);
      setLoggedInUsername(data.username); 
      setId(data.id);
    }
  }

  async function handleForgotPasswordSubmit(ev) {
    ev.preventDefault();
    setForgotPasswordMessage('');
    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('Please enter your email.');
      return;
    }
    try {
      await axios.post('forgot-password', { email: forgotPasswordEmail });
      setForgotPasswordMessage('If that email is registered, you will receive password reset instructions.');
    } catch {
      setForgotPasswordMessage('An error occurred. Please try again.');
    }
  }

  return (
    <div className="bg-blue-50 min-h-screen flex items-center justify-center px-4">
      <form className="w-full max-w-sm bg-white rounded p-6 shadow" onSubmit={handleSubmit}>
        {isLoginOrRegister === 'register' && (
          <>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={mobileNumber}
              onChange={e => setMobileNumber(e.target.value)}
              type="tel"
              placeholder="Mobile Number"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              type="date"
              placeholder="Birthday"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              type="text"
              placeholder="Username"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Confirm Password"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
          </>
        )}

        {isLoginOrRegister === 'login' && !showForgotPassword && (
          <>
            <input
              value={usernameOrEmail}
              onChange={e => setUsernameOrEmail(e.target.value)}
              type="text"
              placeholder="Email or Username"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <div className="text-right mb-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
          </>
        )}

        {showForgotPassword && (
          <form onSubmit={handleForgotPasswordSubmit}>
            <input
              value={forgotPasswordEmail}
              onChange={e => setForgotPasswordEmail(e.target.value)}
              type="email"
              placeholder="Enter your email"
              className="block w-full rounded-sm p-2 mb-2 border"
              required
            />
            <button
              type="submit"
              className="bg-blue-500 text-white block w-full rounded-sm p-2 mb-2"
            >
              Reset Password
            </button>
            <div className="text-sm text-center text-gray-700 mb-2">{forgotPasswordMessage}</div>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail('');
                setForgotPasswordMessage('');
              }}
              className="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-none"
            >
              Back to Login
            </button>
          </form>
        )}

        {!showForgotPassword && (
          <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
            {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
          </button>
        )}

        <div className="text-center mt-2">
          {isLoginOrRegister === 'register' && !showForgotPassword && (
            <div>
              Already have an account?{" "}
              <button
                type="button"
                className="ml-1 text-blue-600 underline"
                onClick={() => {
                  setIsLoginOrRegister('login');
                  setShowForgotPassword(false);
                }}
              >
                Login here
              </button>
            </div>
          )}
          {isLoginOrRegister === 'login' && !showForgotPassword && (
            <div>
              Don't have an account?{" "}
              <button
                type="button"
                className="ml-1 text-blue-600 underline"
                onClick={() => {
                  setIsLoginOrRegister('register');
                  setShowForgotPassword(false);
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
