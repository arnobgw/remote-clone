import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface NewWindowProps {
    children: React.ReactNode;
    onClose: () => void;
    title?: string;
}

export const NewWindow: React.FC<NewWindowProps> = ({ children, onClose, title = 'Remote Session' }) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const newWindow = useRef<Window | null>(null);

    useEffect(() => {
        // Create new window
        const win = window.open('', '', 'width=1280,height=720,left=200,top=200');
        if (!win) {
            console.error('Failed to open new window');
            return;
        }

        newWindow.current = win;
        win.document.title = title;

        // Create container
        const div = win.document.createElement('div');
        div.style.height = '100%';
        div.style.backgroundColor = '#000'; // Match app bg
        win.document.body.appendChild(div);
        win.document.body.style.margin = '0';
        win.document.body.style.height = '100vh';
        win.document.body.style.overflow = 'hidden'; // Prevent scroll on body

        setContainer(div);

        // Copy styles
        Array.from(document.styleSheets).forEach((styleSheet) => {
            try {
                if (styleSheet.href) {
                    const newLink = win.document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = styleSheet.href;
                    win.document.head.appendChild(newLink);
                } else if (styleSheet.cssRules) {
                    const newStyle = win.document.createElement('style');
                    Array.from(styleSheet.cssRules).forEach((rule) => {
                        newStyle.appendChild(win.document.createTextNode(rule.cssText));
                    });
                    win.document.head.appendChild(newStyle);
                }
            } catch (e) {
                console.warn('Failed to copy stylesheet', e);
            }
        });

        // Handle close
        win.onbeforeunload = () => {
            onClose();
        };

        return () => {
            if (newWindow.current) {
                newWindow.current.close();
            }
        };
    }, []);

    if (!container) return null;

    return createPortal(children, container);
};
