"use client";

import Script from "next/script";
import { RagRabbitSearch } from "@repo/design/components/dashboard/ragrabbit-search";
import Image from "next/image";
import { Button } from "@repo/design/shadcn/button";
import { Github } from "@repo/design/base/icons";

export default function WidgetDemo() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <Script src="/widget.js" strategy="lazyOnload" />

      {/* Header with search */}
      <header className="border-b bg-white shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            {/* Logo placeholder */}
            <div className="w-32 h-8 bg-gray-200 rounded"></div>

            {/* Navigation placeholder */}
            <div className="hidden md:flex space-x-4 ml-8">
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Logo and title */}
          <div className="pr-20">
            <a
              href="https://github.com/madarco/ragrabbit"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo_small.svg"
                alt="RagRabbit"
                width={0}
                height={0}
                className="inline-block w-8 h-8 align-text-bottom mb-[-1px] mr-2"
              />
              <h1 className="text-2xl font-bold text-[#56A101]">RagRabbit</h1>
            </a>
          </div>

          {/* Search */}
          <div className="w-[300px] relative">
            <RagRabbitSearch />
            {/* Handwritten arrow pointing to search */}
            <div className="absolute -left-32 top-10">
              <svg width="200" height="200" viewBox="0 -0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3.17247 25.8421C5.28745 28.1788 7.82542 30.0907 9.7289 32.6399C26.0142 55.3699 49.279 66.6287 75.0817 72.7892C83.9646 74.9135 94.1165 74.7011 103.211 72.7892C129.225 67.6909 152.913 56.8569 173.428 39.8625C179.35 34.9766 184.426 28.8161 188.656 21.8059C186.33 22.6556 183.792 23.5054 181.465 24.5675C174.697 27.5415 167.929 30.728 160.95 33.2772C157.989 34.3393 154.393 34.3393 151.009 34.1269C149.74 34.1269 147.837 32.215 147.625 30.9404C147.414 29.6658 148.683 27.3291 149.74 27.1167C167.718 21.5935 183.369 10.972 199.654 1.83746C205.364 -1.34899 208.96 -0.49927 211.498 5.23635C217.631 19.4692 220.381 34.5517 219.958 50.0592C219.958 50.484 219.112 51.1213 217.843 52.3959C205.364 47.7224 209.171 34.1269 203.038 23.2929C201.557 25.8421 200.5 27.9664 199.231 29.6658C172.582 62.5926 137.262 80.0118 96.2315 86.3848C90.0981 87.4469 83.3301 87.022 76.9852 85.9599C53.7205 81.9237 32.9937 72.1519 15.8623 55.7948C10.3634 50.484 6.34493 43.4738 2.32647 36.8885C0.634492 34.3393 0.634494 30.728 0 27.754C1.05749 27.1167 2.11498 26.4794 3.17247 25.8421Z"
                  fill="#0D1927"
                />
              </svg>
              <p className="font-medium absolute -left-20 top-0  whitespace-nowrap">Click here</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Hero section */}
        <div className="w-full h-48 bg-gray-200 rounded-lg mb-8"></div>

        {/* Code snippet*/}
        <div className="w-full p-4 text-gray-200 bg-black rounded-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-200">Installation</h3>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-black border-gray-700 hover:underline"
              onClick={() => window.open("https://github.com/madarco/ragrabbit", "_blank")}
            >
              <Github className="mr-2 h-4 w-4" />
              View on Github
            </Button>
          </div>
          <pre>
            <code>{`<Script src="/widget.js?type=search" strategy="lazyOnload" />
<ragrabbit-search />
`}</code>
          </pre>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Text content placeholders */}
        <div className="mt-8 space-y-4">
          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
          <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
        </div>
      </main>

      {/* Handwritten arrow pointing to bottom right corner */}
      <div className="fixed bottom-20 right-6">
        <svg width="200px" height="200px" viewBox="-13 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 2.65037C6.14938 -1.37392 12.2988 -0.103094 17.812 1.80315C25.4458 4.55662 32.8674 8.1573 39.6529 12.3934C70.3998 32.7267 88.8479 61.744 96.4816 97.539C98.39 106.647 99.0262 116.178 100.299 126.556C108.78 121.685 113.233 112.154 121.715 106.647C122.776 110.883 120.655 113.636 118.959 115.966C111.961 125.497 104.752 135.028 97.3299 144.348C93.725 148.796 90.9684 149.219 87.1515 145.407C79.0937 137.57 74.2167 128.039 72.7323 117.025C72.7323 116.601 73.3684 115.966 74.2166 114.907C83.3347 117.237 81.2142 128.886 89.06 133.122C92.4527 118.508 89.9082 104.529 86.0913 90.973C82.0624 76.7821 76.7612 63.2266 68.2793 51.1537C60.0095 39.2926 49.6191 29.7614 38.1686 20.8656C26.93 11.758 14.2072 6.03925 0 2.65037Z"
            fill="#0D1927"
          />
        </svg>
        <p className=" font-medium absolute -left-24 -top-8 whitespace-nowrap">Or try the chat button</p>
      </div>
    </div>
  );
}
