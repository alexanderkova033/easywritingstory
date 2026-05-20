import { lazy, Suspense } from "react";
import { TemplatesModal } from "./TemplatesModal";
import { lazyWithReload } from "@/app/lazy-with-reload";
import type { SharedStory } from "@/workshop/sharing/sharing";

// Heavy modals are lazy — first paint of the workshop doesn't need them.
// Each opens infrequently and ships its own CSS, so deferring them keeps
// the initial JS payload smaller and improves first-load over slow links.
const ReadingModeModal = lazy(
  lazyWithReload(() =>
    import("@/workshop/reading/ReadingModeModal").then((m) => ({ default: m.ReadingModeModal })),
  ),
);
const ShareModal = lazy(
  lazyWithReload(() =>
    import("@/workshop/sharing/ShareModal").then((m) => ({ default: m.ShareModal })),
  ),
);
const ViewSharedStory = lazy(
  lazyWithReload(() =>
    import("@/workshop/sharing/ShareModal").then((m) => ({ default: m.ViewSharedStory })),
  ),
);

interface WorkshopModalsProps {
  // Templates
  isTemplatesOpen: boolean;
  onCloseTemplates: () => void;
  onInsertTemplate: (body: string, form: string) => void;
  // Reading mode
  isReadingMode: boolean;
  onCloseReadingMode: () => void;
  title: string;
  formNote: string;
  body: string;
  // Share
  isShareOpen: boolean;
  onCloseShare: () => void;
  // Shared poem view
  sharedStoryView: SharedStory | null;
  onDismissSharedStory: () => void;
  onAddSharedStoryToDrafts: (story: SharedStory) => void;
}

export function WorkshopModals({
  isTemplatesOpen, onCloseTemplates, onInsertTemplate,
  isReadingMode, onCloseReadingMode, title, formNote, body,
  isShareOpen, onCloseShare,
  sharedStoryView, onDismissSharedStory, onAddSharedStoryToDrafts,
}: WorkshopModalsProps) {
  return (
    <>
      {isTemplatesOpen && (
        <TemplatesModal
          onClose={onCloseTemplates}
          onInsert={onInsertTemplate}
        />
      )}

      {isReadingMode && (
        <Suspense fallback={null}>
          <ReadingModeModal
            title={title}
            formNote={formNote}
            body={body}
            onClose={onCloseReadingMode}
          />
        </Suspense>
      )}

      {isShareOpen && (
        <Suspense fallback={null}>
          <ShareModal
            story={{ title, body }}
            onClose={onCloseShare}
          />
        </Suspense>
      )}

      {sharedStoryView && (
        <Suspense fallback={null}>
          <ViewSharedStory
            story={sharedStoryView}
            onDismiss={onDismissSharedStory}
            onAddToDrafts={() => onAddSharedStoryToDrafts(sharedStoryView)}
          />
        </Suspense>
      )}
    </>
  );
}
