// components/DashboardClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Models } from "node-appwrite";

import ActionDropdown from "@/components/ActionDropdown";
import { Chart } from "@/components/Chart";
import { FormattedDateTime } from "@/components/FormattedDateTime";
import { Thumbnail } from "@/components/Thumbnail";
import { Separator } from "@/components/ui/separator";
import { convertFileSize, getUsageSummary } from "@/lib/utils";
import { useState } from "react";
import { Client, Storage } from "appwrite";
import axios from "axios";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const client = new Client();
client.setEndpoint("https://cloud.appwrite.io/v1").setProject("67e344bb0038e1696799");
const storage = new Storage(client);

const DashboardClient = ({ files, totalSpace }: { files: Models.Document[]; totalSpace: any }) => {
  const usageSummary = getUsageSummary(totalSpace);

  return (
    <div className="dashboard-container">
      <section>
        <Chart used={totalSpace.used} />

        <ul className="dashboard-summary-list">
          {usageSummary.map((summary) => (
            <Link
              href={summary.url}
              key={summary.title}
              className="dashboard-summary-card"
            >
              <div className="space-y-4">
                <div className="flex justify-between gap-3">
                  <Image
                    src={summary.icon}
                    width={100}
                    height={100}
                    alt="uploaded image"
                    className="summary-type-icon"
                  />
                  <h4 className="summary-type-size">
                    {convertFileSize(summary.size) || 0}
                  </h4>
                </div>

                <h5 className="summary-type-title">{summary.title}</h5>
                <Separator className="bg-light-400" />
                <FormattedDateTime
                  date={summary.latestDate}
                  className="text-center"
                />
              </div>
            </Link>
          ))}
        </ul>
      </section>

      <section className="dashboard-recent-files">
        <h2 className="h3 xl:h2 text-light-100">Recent files uploaded</h2>
        {files.length > 0 ? (
          <TooltipProvider>
            <ul className="mt-5 flex flex-col gap-5">
              {files.map((file: Models.Document) => (
                <HoverSummaryItem key={file.$id} file={file} />
              ))}
            </ul>
          </TooltipProvider>
        ) : (
          <p className="empty-list">No files uploaded</p>
        )}
      </section>
    </div>
  );
};

export default DashboardClient;

const HoverSummaryItem = ({ file }: { file: Models.Document }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleHover = async () => {
    if (summary || loading) return;
    try {
      setLoading(true);
      console.log("🧾 当前 file：", file);

      const fileUrl = storage.getFileDownload("67e37280001af7e63fc2", file.bucketFileId);
      const response = await fetch(fileUrl);
      const blob = await response.blob();

      // 用 UTF-8 解码器处理二进制内容
      const arrayBuffer = await blob.arrayBuffer();
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(arrayBuffer);

      const res = await axios.post("http://localhost:8000/analyze-text", {
        text,
        mode: "summary",
      });

      setSummary(res.data.result);
    } catch (err) {
      console.error("分析失败：", err);
      setSummary("分析失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Link
          href={file.url}
          target="_blank"
          className="flex items-center gap-3"
          onMouseEnter={handleHover}
        >
          <Thumbnail
            type={file.type}
            extension={file.extension}
            url={file.url}
          />

          <div className="recent-file-details">
            <div className="flex flex-col gap-1">
              <p className="recent-file-name">{file.name}</p>
              <FormattedDateTime date={file.$createdAt} className="caption" />
            </div>
            <ActionDropdown file={file} />
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs p-2 text-sm">
        {loading ? "正在分析..." : summary || "悬停以生成摘要"}
      </TooltipContent>
    </Tooltip>
  );
};
