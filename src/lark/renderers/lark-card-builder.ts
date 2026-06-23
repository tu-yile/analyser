import type { JsonObject } from "../types/lark-types.js";

const STREAMING_ELEMENT_ID = "codex_stream_body";

function buildStatusBadge(text: string, color = "grey"): JsonObject {
  return {
    tag: "markdown",
    content: `<font color='${color}'>${text}</font>`,
  };
}

/**
 * 某些环境下 column_set 校验更严格，失败时会回退移除该结构。
 */
export function stripStatusCorner(card: JsonObject): JsonObject {
  if (!card?.body?.elements || !Array.isArray(card.body.elements)) {
    return card;
  }
  const cloned = JSON.parse(JSON.stringify(card));
  cloned.body.elements = cloned.body.elements.filter((element: JsonObject) => element?.tag !== "column_set");
  return cloned;
}

export function buildStreamingCard(text: string): JsonObject {
  return {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    body: {
      elements: [
        {
          tag: "markdown",
          element_id: STREAMING_ELEMENT_ID,
          content: text || "处理中...",
        },
      ],
    },
  };
}

export function buildCompletedCard(text: string): JsonObject {
  return {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
      update_multi: true,
    },
    body: {
      elements: [
        buildStatusBadge("已完成", "green"),
        {
          tag: "markdown",
          content: text || "任务完成，但没有返回文本。",
        },
      ],
    },
  };
}

export function buildCollapsibleMarkdownCard({
  markdown,
  title = "Markdown 报告",
  panelTitle = "点击展开完整内容",
  expanded = false,
}: {
  markdown: string;
  title?: string;
  panelTitle?: string;
  expanded?: boolean;
}): JsonObject {
  return {
    schema: "2.0",
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: title,
      },
    },
    body: {
      elements: [
        {
          tag: "collapsible_panel",
          element_id: "markdown_panel",
          expanded,
          header: {
            title: {
              tag: "markdown",
              content: `**${panelTitle}**`,
            },
            vertical_align: "center",
            icon: {
              tag: "standard_icon",
              token: "down-small-ccm_outlined",
              size: "16px 16px",
            },
            icon_position: "right",
            icon_expanded_angle: -180,
          },
          border: {
            color: "grey",
            corner_radius: "5px",
          },
          vertical_spacing: "8px",
          padding: "8px 8px 8px 8px",
          elements: [
            {
              tag: "markdown",
              content: markdown || "无内容",
            },
          ],
        },
      ],
    },
  };
}
