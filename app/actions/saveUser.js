'use server'

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const saveUser = async (user) => {
    try {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';

        const [dbUser] = await db
            .insert(users)
            .values({
                clerkId: user.id,
                name: name,
                email: user.email,
            })
            .onConflictDoUpdate({
                target: users.clerkId,
                set: {
                    name: name,
                    email: user.email,
                },
            })
            .returning();

        return dbUser;
    } catch (error) {
        console.error("Failed to save user:", error.message, "Input:", JSON.stringify(user));
        throw new Error(`Could not sync user: ${error.message}`);
    }
}
