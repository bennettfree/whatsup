import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: move these into environment variables (see supabase-env-config plan task)
const SUPABASE_URL = 'https://oczadsgswettdwtwngwd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_78IOqOZxISAGV3KLwzfsPA_5m1j6Yfb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});


