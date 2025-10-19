import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FormConfiguration {
  id: string;
  config_type: string;
  config_key: string;
  config_value: string;
  display_order: number;
  is_active: boolean;
}

interface CourseConfig {
  value: string;
  label: string;
  category: string;
}

export const useFormConfigurations = () => {
  const [courses, setCourses] = useState<CourseConfig[]>([]);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ value: string; label: string }[]>([]);
  const [programs, setPrograms] = useState<{ value: string; label: string }[]>([]);
  const [classTypes, setClassTypes] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from("form_configurations")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const configs = data as FormConfiguration[];

      // Parse courses (they have JSON in config_value)
      const coursesData = configs
        .filter((c) => c.config_type === "course")
        .map((c) => {
          const parsed = JSON.parse(c.config_value);
          return {
            value: c.config_key,
            label: parsed.label,
            category: parsed.category,
          };
        });

      // Parse simple configs
      const branchesData = configs
        .filter((c) => c.config_type === "branch")
        .map((c) => ({ value: c.config_key, label: c.config_value }));

      const paymentMethodsData = configs
        .filter((c) => c.config_type === "payment_method")
        .map((c) => ({ value: c.config_key, label: c.config_value }));

      const programsData = configs
        .filter((c) => c.config_type === "program")
        .map((c) => ({ value: c.config_key, label: c.config_value }));

      const classTypesData = configs
        .filter((c) => c.config_type === "class_type")
        .map((c) => ({ value: c.config_key, label: c.config_value }));

      setCourses(coursesData);
      setBranches(branchesData);
      setPaymentMethods(paymentMethodsData);
      setPrograms(programsData);
      setClassTypes(classTypesData);
    } catch (error) {
      console.error("Error fetching form configurations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();

    // Subscribe to changes
    const channel = supabase
      .channel("form_configurations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "form_configurations",
        },
        () => {
          fetchConfigurations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    courses,
    branches,
    paymentMethods,
    programs,
    classTypes,
    loading,
    refetch: fetchConfigurations,
  };
};
