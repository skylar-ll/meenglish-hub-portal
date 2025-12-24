import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MappingResponse = {
  levelTeachers: Record<string, string>;
  courseTeachers: Record<string, string>;
  levelTimings: Record<string, string[]>;
  courseTimings: Record<string, string[]>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userResult, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    let branchId: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      branchId = body?.branchId ?? null;
    } else {
      const url = new URL(req.url);
      branchId = url.searchParams.get("branchId");
    }

    if (!branchId) {
      return new Response(JSON.stringify({ error: "branchId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: classes, error: classError } = await supabaseAdmin
      .from("classes")
      .select(
        `
        id,
        levels,
        courses,
        timing,
        teacher_id,
        teachers (
          id,
          full_name
        )
      `,
      )
      .eq("branch_id", branchId)
      .eq("status", "active");

    if (classError) throw classError;

    const levelTeachers: Record<string, string> = {};
    const courseTeachers: Record<string, string> = {};
    const levelTimings: Record<string, string[]> = {};
    const courseTimings: Record<string, string[]> = {};

    const pushUnique = (map: Record<string, string[]>, key: string, value: string) => {
      if (!value) return;
      if (!map[key]) map[key] = [];
      if (!map[key].includes(value)) map[key].push(value);
    };

    (classes || []).forEach((cls: any) => {
      const teacherName: string = cls?.teachers?.full_name || "";
      const timing: string = cls?.timing || "";

      if (cls?.levels && Array.isArray(cls.levels)) {
        cls.levels.forEach((level: string) => {
          const normalizedLevel = (level || "").trim();
          if (normalizedLevel) {
            if (teacherName && !levelTeachers[normalizedLevel]) levelTeachers[normalizedLevel] = teacherName;
            pushUnique(levelTimings, normalizedLevel, timing);
          }
        });
      }

      if (cls?.courses && Array.isArray(cls.courses)) {
        cls.courses.forEach((course: string) => {
          const normalizedCourse = (course || "").trim();
          if (normalizedCourse) {
            if (teacherName && !courseTeachers[normalizedCourse]) courseTeachers[normalizedCourse] = teacherName;
            pushUnique(courseTimings, normalizedCourse, timing);
          }
        });
      }
    });

    const payload: MappingResponse = {
      levelTeachers,
      courseTeachers,
      levelTimings,
      courseTimings,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("teacher-course-mapping error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
