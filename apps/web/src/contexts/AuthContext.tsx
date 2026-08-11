'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

export type UserRole = 'admin' | 'medico' | 'farmaceutico' | 'recepcionista';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  roleLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  roleLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setRole((snap.data()?.role as UserRole) || null);
      setRoleLoading(false);
    }, () => {
      setRole(null);
      setRoleLoading(false);
    });
    return () => unsubscribe();
    // Depende só de user?.uid (não do objeto `user` inteiro), que troca de
    // referência a cada refresh de token do Firebase Auth sem o uid mudar —
    // sem isso, essa subscription do Firestore reinicia sozinha o tempo todo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{ user, loading, role, roleLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
