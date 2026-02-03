"use client";

import { Spinner } from "@/components/ui/spinner";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function ComponentTestPage() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold">Loading Components Test</h1>

      {/* Spinner Tests */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Spinner Component</h2>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Default:</span>
            <Spinner />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Small (text-xs):</span>
            <Spinner className="text-xs" />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Large (text-lg):</span>
            <Spinner className="text-lg" />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Blue:</span>
            <Spinner className="text-blue-500" />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Success:</span>
            <Spinner className="text-green-500" />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Error:</span>
            <Spinner className="text-red-500" />
          </div>
        </div>
      </section>

      {/* LoadingIndicator Tests */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">LoadingIndicator Component</h2>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Simple:</span>
            <LoadingIndicator />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">With label:</span>
            <LoadingIndicator label="Loading..." />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">With elapsed:</span>
            <LoadingIndicator label="Processing" showElapsed />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Custom size:</span>
            <LoadingIndicator
              label="Small indicator"
              spinnerClassName="text-[8px]"
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-32 text-sm text-muted-foreground">Static (no animation):</span>
            <LoadingIndicator label="Pending" animated={false} />
          </div>
        </div>
      </section>

      {/* Real-world Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Real-world Examples</h2>

        <div className="space-y-4 p-4 border rounded-lg">
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <LoadingIndicator
                label="Read"
                spinnerClassName="text-[10px]"
                className="text-[13px]"
                showElapsed
              />
            </div>

            <div className="flex items-center gap-2">
              <LoadingIndicator
                label="Edit · app/page.tsx"
                spinnerClassName="text-[10px]"
                className="text-[13px]"
                showElapsed
              />
            </div>

            <div className="flex items-center gap-2">
              <LoadingIndicator
                label="Bash · npm install"
                spinnerClassName="text-[10px]"
                className="text-[13px]"
                showElapsed
              />
            </div>

            <div className="flex items-center gap-2 pl-4">
              <LoadingIndicator
                label="Task · Running tests"
                spinnerClassName="text-[10px]"
                className="text-[13px]"
                showElapsed
              />
            </div>
          </div>
        </div>
      </section>

      {/* Dark Mode Test */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dark Mode Test</h2>
        <div className="p-6 bg-gray-900 dark:bg-gray-100 rounded-lg space-y-3">
          <div className="flex items-center gap-4 text-white dark:text-black">
            <LoadingIndicator label="Dark mode spinner" showElapsed />
          </div>
          <div className="flex items-center gap-4 text-blue-400 dark:text-blue-600">
            <LoadingIndicator label="Colored in dark" showElapsed />
          </div>
        </div>
      </section>
    </div>
  );
}
