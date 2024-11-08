import { Divider, Spin } from "@arco-design/web-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { forwardRef, useCallback, useEffect } from "react";

import useLoadMore from "../../hooks/useLoadMore";
import ArticleCard from "./ArticleCard";
import LoadingCards from "./LoadingCards";

import { useStore } from "@nanostores/react";
import { useInView } from "react-intersection-observer";
import SimpleBar from "simplebar-react";
import { contentState, filteredEntriesState } from "../../store/contentState";
import { settingsState } from "../../store/settingsState";
import { mergeRefs } from "../../utils/refs";
import FadeInMotion from "../ui/FadeInMotion";
import Ripple from "../ui/Ripple";
import "./ArticleList.css";

const LoadMoreComponent = ({ getEntries }) => {
  const { isArticleListReady, loadMoreVisible } = useStore(contentState);

  const { loadingMore, handleLoadMore } = useLoadMore();

  const { ref: loadMoreRef, inView } = useInView();

  const loadMoreEntries = useCallback(async () => {
    if (loadMoreVisible && inView && isArticleListReady && !loadingMore) {
      await handleLoadMore(getEntries);
    }
  }, [
    loadMoreVisible,
    inView,
    isArticleListReady,
    loadingMore,
    handleLoadMore,
    getEntries,
  ]);

  useEffect(() => {
    const intervalId = setInterval(loadMoreEntries, 500);

    return () => clearInterval(intervalId);
  }, [loadMoreEntries]);

  return (
    isArticleListReady &&
    loadMoreVisible && (
      <div className="load-more-container" ref={loadMoreRef}>
        <Spin loading={loadingMore} style={{ paddingRight: "10px" }} />
        Loading more ...
      </div>
    )
  );
};

const ArticleList = forwardRef(
  ({ getEntries, handleEntryClick, cardsRef }, ref) => {
    const { pageSize } = useStore(settingsState);

    const { isArticleListReady, loadMoreVisible } = useStore(contentState);
    const filteredEntries = useStore(filteredEntriesState);
    const lastPercent20StartIndex =
      filteredEntries.length - Math.ceil(pageSize * 0.2) - 1;

    const { loadingMore, handleLoadMore } = useLoadMore();

    const { ref: loadMoreRef } = useInView({
      skip: !loadMoreVisible,
      onChange: async (inView) => {
        if (!inView || !isArticleListReady || loadingMore) {
          return;
        }
        await handleLoadMore(getEntries);
      },
    });

    const virtualizer = useVirtualizer({
      count: filteredEntries.length,
      getScrollElement: () => cardsRef.current,
      estimateSize: useCallback(() => 160, []),
      overscan: 5,
    });
    const virtualItems = virtualizer.getVirtualItems();

    const getItemRef = useCallback(
      (index) => {
        if (index === lastPercent20StartIndex) {
          return mergeRefs(virtualizer.measureElement, loadMoreRef);
        }
        return virtualizer.measureElement;
      },
      [lastPercent20StartIndex, virtualizer.measureElement, loadMoreRef],
    );

    return (
      <>
        <SimpleBar className="entry-list" ref={ref}>
          <LoadingCards />
          {isArticleListReady && (
            <FadeInMotion>
              <div ref={cardsRef}>
                <div
                  style={{
                    height: virtualizer.getTotalSize(),
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {virtualItems.map((item) => (
                    <div
                      key={item.key}
                      data-index={item.index}
                      ref={getItemRef(item.index)}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      <ArticleCard
                        entry={filteredEntries[item.index]}
                        handleEntryClick={handleEntryClick}
                      >
                        <Ripple color="var(--color-text-4)" duration={1000} />
                      </ArticleCard>
                      {!(item.index === filteredEntries.length - 1) && (
                        <Divider
                          style={{
                            margin: "8px 0",
                            borderBottom: "1px solid var(--color-border-2)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </FadeInMotion>
          )}
          <LoadMoreComponent getEntries={getEntries} />
        </SimpleBar>
      </>
    );
  },
);

export default ArticleList;
