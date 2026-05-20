import { loadArray, loadObject, saveArray, saveObject, storageKeys } from './localStore';

const localUsersKey = 'local_auth_users';

const makeLocalUser = (email, displayName = '') => ({
  uid: `local_${btoa(email).replace(/=/g, '')}`,
  displayName: displayName || email.split('@')[0],
  email,
  photoURL: '',
  provider: 'local',
});

const registerLocalUser = (email, password) => {
  const users = loadObject(localUsersKey, {});
  if (users[email]) throw new Error('This local email account already exists.');
  users[email] = { password, createdAt: new Date().toISOString() };
  saveObject(localUsersKey, users);
  return makeLocalUser(email);
};

const loginLocalUser = (email, password) => {
  const users = loadObject(localUsersKey, {});
  if (!users[email]) {
    users[email] = { password, createdAt: new Date().toISOString() };
    saveObject(localUsersKey, users);
  } else if (users[email].password !== password) {
    throw new Error('Incorrect local password.');
  }
  return makeLocalUser(email);
};

export const continueAsLocalGuest = async () => {
  const user = makeLocalUser('local.user@parthasarathi.app', 'Local User');
  localStorage.setItem('user_auth', JSON.stringify(user));
  return user;
};

export const logoutUser = async () => Promise.resolve();

export const registerWithEmail = async (email, password) => registerLocalUser(email, password);

export const loginWithEmail = async (email, password) => loginLocalUser(email, password);

export const loadChatSessions = async (uid) => loadArray(storageKeys(uid).sessions);
export const saveChatSessions = async (uid, sessions) => saveArray(storageKeys(uid).sessions, sessions);
export const loadUserMemories = async (uid) => loadArray(storageKeys(uid).memories);
export const saveUserMemories = async (uid, memories) => saveArray(storageKeys(uid).memories, memories);
export const loadUserProfile = async (uid) => loadObject(storageKeys(uid).profile, null);
export const saveUserProfile = async (uid, profile) => saveObject(storageKeys(uid).profile, profile);
