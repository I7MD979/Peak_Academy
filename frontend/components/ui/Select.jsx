"use client";

import { forwardRef } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";

const Select = forwardRef(
  ({ className, label, error, children, variant = "light", placeholder, showError, ...props }, ref) => {
    return (
      <CustomSelect
        ref={ref}
        className={cn(className)}
        label={label}
        error={error}
        variant={variant}
        placeholder={placeholder}
        showError={showError}
        {...props}
      >
        {children}
      </CustomSelect>
    );
  }
);
Select.displayName = "Select";

export { Select };
