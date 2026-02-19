
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  id: string;
  name: string;
  role: string;
  profilePic: string;
  personalEmail: string;
  secretaryEmail: string;
}

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    name: 'Loading...',
    role: '',
    profilePic: '',
    personalEmail: '',
    secretaryEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setProfile({
        id: data.id,
        name: data.name,
        role: data.role || '',
        profilePic: data.profile_pic || '',
        personalEmail: data.email || '',
        secretaryEmail: data.secretary_email || '',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<ProfileData>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.profilePic !== undefined) dbUpdates.profile_pic = updates.profilePic;
    if (updates.personalEmail !== undefined) dbUpdates.email = updates.personalEmail;
    if (updates.secretaryEmail !== undefined) dbUpdates.secretary_email = updates.secretaryEmail;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${profile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ profilePic: urlData.publicUrl });
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleEditInfo = (field: keyof ProfileData, label: string) => {
    const currentValue = profile[field] as string;
    const newValue = window.prompt(`Update ${label}:`, currentValue);

    if (newValue !== null && newValue.trim() !== '') {
      updateProfile({ [field]: newValue.trim() } as Partial<ProfileData>);
    }
  };

  const administrativeSettings = [
    {
      id: 'personalEmail',
      icon: 'mail',
      label: 'Personal Email',
      sub: profile.personalEmail,
      displayName: 'Personal Email'
    },
    {
      id: 'secretaryEmail',
      icon: 'support_agent',
      label: 'Secretary Email',
      sub: profile.secretaryEmail,
      displayName: 'Secretary Email'
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FBFBFE]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-bold">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar pb-40 bg-[#FBFBFE]">
      <header className="sticky top-0 z-30 bg-[#FBFBFE]/90 backdrop-blur-xl px-6 pt-12 pb-4 border-b border-gray-100/50">
        <div className="flex items-center justify-between h-12">
          <h1 className="text-3xl font-black text-secondary tracking-tight">Profile</h1>
          <div className="w-11 h-11 flex items-center justify-center rounded-full bg-white shadow-card border border-gray-100">
            <span className="material-symbols-outlined text-[#d4af35] text-[24px] fill-1">verified_user</span>
          </div>
        </div>
      </header>

      <main className="pt-8">
        <div className="flex flex-col items-center px-6 w-full mb-10">
          {/* Avatar with file upload */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div
            className="relative mb-6 cursor-pointer group"
            onClick={() => avatarInputRef.current?.click()}
          >
            <div className="w-32 h-32 rounded-full border-4 border-[#d4af35] p-1.5 transition-transform group-hover:scale-105 active:scale-95 shadow-lg">
              {uploading ? (
                <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-[#d4af35] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div
                  className="w-full h-full rounded-full bg-center bg-cover border-2 border-white shadow-inner"
                  style={{ backgroundImage: `url('${profile.profilePic}')` }}
                ></div>
              )}
              <div className="absolute inset-1.5 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="material-symbols-outlined text-white/80 scale-125">photo_camera</span>
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-[#d4af35] text-white p-1.5 rounded-full border-4 border-[#FBFBFE] shadow-fab">
              <span className="material-symbols-outlined text-[16px] block fill-1">photo_camera</span>
            </div>
          </div>

          <div className="text-center group cursor-pointer" onClick={() => handleEditInfo('name', 'Full Name')}>
            <h2 className="text-2xl font-black text-secondary tracking-tight group-hover:text-[#d4af35] transition-colors">{profile.name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2" onClick={(e) => { e.stopPropagation(); handleEditInfo('role', 'Job Title'); }}>
              <p className="text-[#d4af35] font-black text-xs uppercase tracking-tight hover:opacity-70 transition-opacity">{profile.role}</p>
              <span className="material-symbols-outlined text-[14px] text-gray-300">edit</span>
            </div>
          </div>
        </div>

        <div className="px-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-6 px-1">Administrative Settings</h3>
          <div className="space-y-2">
            {administrativeSettings.map((item) => (
              <div
                key={item.id}
                onClick={() => handleEditInfo(item.id as keyof ProfileData, item.displayName)}
                className="flex items-center gap-5 p-5 rounded-[2.25rem] hover:bg-white transition-all group border border-transparent hover:border-gray-100 cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-soft"
              >
                <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all bg-gray-50 text-secondary group-hover:bg-secondary group-hover:text-white shrink-0">
                  <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black text-secondary group-hover:text-[#d4af35] transition-colors">{item.label}</p>
                  <p className="text-[12px] mt-1 font-bold truncate text-gray-400">
                    {item.sub}
                  </p>
                </div>
                <span className="material-symbols-outlined text-gray-300 text-[20px] group-hover:text-[#d4af35] group-hover:translate-x-1 transition-all">chevron_right</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <div className="px-6 mt-8 mb-8">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-[2.25rem] bg-white border border-red-100 hover:bg-red-50 transition-all group active:scale-[0.98] shadow-sm hover:shadow-soft"
          >
            <span className="material-symbols-outlined text-red-400 text-[22px]">logout</span>
            <span className="text-[15px] font-black text-red-400 group-hover:text-red-500 transition-colors">Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
