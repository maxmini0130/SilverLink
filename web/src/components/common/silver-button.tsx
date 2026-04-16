"use client";

import React from "react";
import { cn } from "@/lib/utils"; // shadcn/ui 기본 유틸리티 사용 예상

interface SilverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "md" | "lg" | "xl";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const SilverButton = ({
  variant = "primary",
  size = "lg",
  icon,
  children,
  className,
  ...props
}: SilverButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center gap-3 rounded-2xl font-semibold transition-all active:scale-[0.98]";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-opacity-90 shadow-md",
    secondary: "bg-secondary text-white hover:bg-opacity-90 shadow-md",
    outline: "border-2 border-primary text-primary bg-white hover:bg-muted",
    ghost: "bg-transparent text-foreground hover:bg-muted",
  };

  const sizes = {
    md: "px-6 h-[48px] text-[17px]",
    lg: "px-8 h-[56px] text-[18px]", // 권장 사이즈
    xl: "px-10 h-[64px] text-[20px]", // 특히 강조할 행동
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {icon && <span className="w-6 h-6">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
