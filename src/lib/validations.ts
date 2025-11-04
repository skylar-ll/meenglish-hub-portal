import { z } from 'zod';

export const studentSignupSchema = z.object({
  fullNameAr: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  fullNameEn: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  gender: z.enum(['male', 'female'], { required_error: 'Please select gender' }),
  phone1: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  phone2: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  id: z.string().min(8, "ID must be at least 8 characters").max(20, "ID too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
});

export const teacherSignupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
