import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config';

export const ensureAdminUser = async (): Promise<void> => {
  try {
    const email = config.admin.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(config.admin.password, salt);
      await User.create({
        name: config.admin.name,
        email,
        passwordHash,
        role: 'superadmin',
        status: 'active',
      });
      console.log(`[Auth] Created default admin account: ${email}`);
    } else {
      // Verify password match; if different or role/status changed, update it
      const isMatch = await existing.comparePassword(config.admin.password);
      if (!isMatch || existing.role !== 'superadmin' || existing.status !== 'active') {
        const salt = await bcrypt.genSalt(10);
        existing.passwordHash = await bcrypt.hash(config.admin.password, salt);
        existing.role = 'superadmin';
        existing.status = 'active';
        await existing.save();
        console.log(`[Auth] Synchronized admin credentials for: ${email}`);
      }
    }
  } catch (err) {
    console.error('[Auth] Failed to verify/ensure admin user:', err);
  }
};
