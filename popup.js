// Status
function updateStatus(msg, isProcessing = false) {
    const statusText = document.getElementById('status-text');
    const statusBar = document.getElementById('status');
    
    if (statusText && statusBar) {
        statusText.innerText = msg;
        if (isProcessing) {
            statusBar.classList.add('processing');
        } else {
            statusBar.classList.remove('processing');
        }
    } else {
        const oldStatus = document.getElementById('status');
        if (oldStatus) oldStatus.textContent = msg;
    }
}

// Button to delete cookies & reload
document.getElementById('clearBtn').addEventListener('click', async () => {
    updateStatus("Đang quét và xóa cookie...", true);
    
    try {
        const allCookies = await chrome.cookies.getAll({});
        let count = 0;
        for (const cookie of allCookies) {
            if (cookie.domain.includes('studocu')) {
                let cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
                const protocol = cookie.secure ? "https:" : "http:";
                const url = `${protocol}//${cleanDomain}${cookie.path}`;
                await chrome.cookies.remove({ url: url, name: cookie.name, storeId: cookie.storeId });
                count++;
            }
        }
        updateStatus(`Đã xóa ${count} cookies! Đang tải lại...`, false);
        
        setTimeout(() => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if(tabs[0]) chrome.tabs.reload(tabs[0].id);
            });
        }, 1000);
        
    } catch (e) {
        updateStatus("Lỗi: " + e.message, false);
    }
});

// Print / Save as PDF using Studocu-focused scroll + print flow
document.getElementById('checkBtn').addEventListener('click', async () => {
    const checkBtn = document.getElementById('checkBtn');
    updateStatus("Đang chuẩn bị trang để in/PDF...", true);
    if (checkBtn) {
        checkBtn.disabled = true;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            if (!location.hostname.includes('studocu')) {
                alert("Chức năng in/PDF này chỉ hỗ trợ trên Studocu.");
                return;
            }

            const removeAdContent = () => {
                const removeBySelector = (selector) => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                };

                removeBySelector("#adbox");
                removeBySelector(".adsbox");
                removeBySelector(".ad-box");
                removeBySelector(".banner-ads");
                removeBySelector(".advert");
                removeBySelector(".PremiumBannerBlobWrapper_overflow-wrapper__xsaS8");

                document.querySelectorAll("*").forEach(el => {
                    if (el.style.filter?.includes("blur") || el.className.toString().includes("blur")) {
                        el.style.filter = "none";
                        el.classList.remove("blur");
                    }
                });

                document.querySelectorAll("div, section, aside").forEach(el => {
                    const bg = window.getComputedStyle(el).backgroundColor;
                    if (bg.includes("rgba") && bg.includes("0.5")) {
                        el.remove();
                    }
                });
            };

            const delay = (ms) => new Promise((res) => setTimeout(res, ms));

            const scrollPageToBottom = async () => {
                let totalHeight = 0;
                const distance = 300;

                return new Promise((resolve) => {
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight - window.innerHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 300);
                });
            };

            const applyPrintStyles = () => {
                const style = document.createElement("style");
                style.id = "print-style-extension";
                style.innerHTML = `
          @media print {
            header, footer, nav, aside, .no-print, .ads, .sidebar,
            .premium-banner, .ViewerToolbar, .Layout_info-bar-wrapper__He0Ho,
            .Sidebar_sidebar-scrollable__kqeBZ, .HeaderWrapper_header-wrapper__mCmf3,
            .Layout_visible-content-bottom-wrapper-sticky__yaaAB,
            .Layout_bottom-section-wrapper__yBWWk,
            .Layout_footer-wrapper__bheJQ, .InlineBanner_inline-banner-wrapper__DAi5X,
            .banner-wrapper, #top-bar-wrapper,
            .Layout_sidebar-wrapper__unavM,
            .Layout_is-open__9DQr4 {
              display: none !important;
            }

            body {
              background: white !important;
              color: black !important;
            }

            * {
              box-shadow: none !important;
              background: transparent !important;
            }

            .Viewer_document-wrapper__JPBWQ,
            .Viewer_document-wrapper__LXzoQ,
            .Viewer_document-wrapper__XsO4j,
            .page-content {
              display: flex !important;
            }
          }
        `;
                document.head.appendChild(style);
            };

            const scrollDownAndPrint = async () => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                await delay(500);

                await scrollPageToBottom();

                window.scrollTo({ top: 0, behavior: "smooth" });
                await delay(1000);

                applyPrintStyles();

                window.print();

                window.onafterprint = () => {
                    document.getElementById("print-style-extension")?.remove();
                };
            };

            removeAdContent();
            scrollDownAndPrint();
        }
    });

    setTimeout(() => {
        if (checkBtn) {
            checkBtn.disabled = false;
        }
        updateStatus("Sẵn sàng hoạt động", false);
    }, 5000);
}
);