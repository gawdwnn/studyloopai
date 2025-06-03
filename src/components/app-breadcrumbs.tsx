"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

export function AppBreadcrumbs() {
  const pathname = usePathname();

  const segments = pathname
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment, index, array) => ({
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: `/${array.slice(0, index + 1).join("/")}`,
    }));

  if (segments.length === 0) return null;

  // Always show first and last items, with ellipsis in between if needed
  const showEllipsis = segments.length > 2;
  const firstItem = segments[0];
  const lastItem = segments[segments.length - 1];
  const middleItems = showEllipsis ? segments.slice(1, -1) : [];

  return (
    <Breadcrumb className="max-w-full overflow-hidden">
      <BreadcrumbList className="flex-wrap">
        {/* Mobile View (show first ... last) */}
        <div className="md:hidden flex items-center">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={firstItem.href} className="truncate">
                {firstItem.label}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {showEllipsis && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1">
                    <BreadcrumbEllipsis className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {middleItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="w-full">
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
            </>
          )}

          {segments.length > 1 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate">
                  {lastItem.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </div>

        {/* Desktop View (show all items) */}
        <div className="hidden md:flex items-center">
          {segments.map((segment, index) => (
            <Fragment key={segment.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {index === segments.length - 1 ? (
                  <BreadcrumbPage className="truncate">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={segment.href} className="truncate">
                      {segment.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </div>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
