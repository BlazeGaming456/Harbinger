import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.image = token.picture;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After Google sign-in, redirect to our bridge handler
      if (url === baseUrl || url === baseUrl + "/")
        return baseUrl + "/auth/google/callback";
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/auth/google/callback";
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
