import {initializeApp} from "firebase/App";//connect with ur firebase project 
import {getAuth,signInWithEmailAndPassword,onAuthStateChange} from "firebase/auth";
const firebaseConfig={
    apiKey:VITE_FIREBASE_API_KEY,
    authDomain:VITE_FIREBASE_AUTH_DOMAIN,
    projectId:VITE_FIREBASE_PROJECT_ID
};
const app =initializeApp(firebaseConfig);
const auth=getAuth(app);
export const loginUser=async(email,password)=>{
    try{
        const userCredentials=await signInWithEmailAndPassword(auth,email,password);
        return userCredentials.user;
    }catch(error){
        throw new Error(error.message);
    }
};
export const useAuthListener=(callback)=>{
    onAuthStateChange=(auth,user)=>{
        callback(user);
    };
};