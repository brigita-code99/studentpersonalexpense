# Sample Snack app

## Supabase setup

The app uses Supabase email/password authentication and stores each user's
allowance, expenses, and savings in the Supabase database.

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not put a service-role key in the
   app.
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the
   Supabase SQL Editor. It creates the tables and row-level security policies
   required by the app.
3. Enable Email authentication in Supabase. If email confirmation is enabled,
   new users must confirm their email before signing in.
4. Restart Expo after changing environment variables.

Open the `App.js` file to start writing some code. You can preview the changes directly on your phone or tablet by scanning the **QR code** or use the iOS or Android emulators. When you're done, click **Save** and share the link!

When you're ready to see everything that Expo provides (or if you want to use your own editor) you can **Download** your project and use it with [expo cli](https://docs.expo.dev/get-started/installation/#expo-cli)).

All projects created in Snack are publicly available, so you can easily share the link to this project via link, or embed it on a web page with the `<>` button.

If you're having problems, you can tweet to us [@expo](https://twitter.com/expo) or ask in our [forums](https://forums.expo.dev/c/expo-dev-tools/61) or [Discord](https://chat.expo.dev/).

Snack is Open Source. You can find the code on the [GitHub repo](https://github.com/expo/snack).
