'use client'

import React, { useEffect, useRef, useState } from 'react'
import 'luckysheet/dist/plugins/css/pluginsCss.css'
import 'luckysheet/dist/plugins/plugins.css'
import 'luckysheet/dist/css/luckysheet.css'
import 'luckysheet/dist/assets/iconfont/iconfont.css'
import '../components/luckysheet-dark.css'

interface LuckysheetComponentProps {
    containerId?: string
    height?: string | number
    width?: string | number
    data?: any[]
    onChange?: (data: any) => void
}

export default function LuckysheetComponent({
    containerId = 'luckysheet',
    height = '600px',
    width = '100%',
    data,
    onChange,
}: LuckysheetComponentProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const instanceRef = useRef<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [scriptsLoaded, setScriptsLoaded] = useState(false)

    // Load jQuery and dependencies first
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Check if already loaded
        if ((window as any).__luckysheeetDepsLoaded) {
            setScriptsLoaded(true)
            return
        }

        let jQueryLoaded = false
        let mousewheelLoaded = false
        let spectrumLoaded = false

        const checkAllLoaded = () => {
            if (jQueryLoaded && mousewheelLoaded && spectrumLoaded) {
                console.log('All Luckysheet dependencies loaded successfully')
                    ; (window as any).__luckysheeetDepsLoaded = true
                setScriptsLoaded(true)
            }
        }

        // Load jQuery
        const jqueryScript = document.createElement('script')
        jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js'
        jqueryScript.onload = () => {
            console.log('jQuery loaded')
            jQueryLoaded = true

            // Load mousewheel after jQuery
            const mousewheelScript = document.createElement('script')
            mousewheelScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js'
            mousewheelScript.onload = () => {
                console.log('jQuery mousewheel loaded')
                mousewheelLoaded = true

                // Load spectrum color picker after mousewheel
                const spectrumScript = document.createElement('script')
                spectrumScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.js'
                spectrumScript.onload = () => {
                    console.log('Spectrum color picker loaded')
                    spectrumLoaded = true

                    // Also load spectrum CSS
                    const spectrumCSS = document.createElement('link')
                    spectrumCSS.rel = 'stylesheet'
                    spectrumCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.1/spectrum.min.css'
                    document.head.appendChild(spectrumCSS)

                    checkAllLoaded()
                }
                spectrumScript.onerror = () => {
                    console.error('Failed to load spectrum color picker')
                    setError('Failed to load color picker plugin')
                }
                document.head.appendChild(spectrumScript)
            }
            mousewheelScript.onerror = () => {
                console.error('Failed to load mousewheel plugin')
                setError('Failed to load mousewheel plugin')
            }
            document.head.appendChild(mousewheelScript)
        }
        jqueryScript.onerror = () => {
            console.error('Failed to load jQuery')
            setError('Failed to load jQuery')
        }
        document.head.appendChild(jqueryScript)
    }, [])

    // Initialize Luckysheet after all scripts are loaded
    useEffect(() => {
        if (!scriptsLoaded) return

        // Retry mechanism for waiting for spectrum to fully register
        let retryCount = 0
        const maxRetries = 10

        const tryInitialize = () => {
            const container = document.getElementById(containerId)

            if (!container) {
                console.error(`Container #${containerId} not found`)
                setError(`Container element not found`)
                return
            }

            // Verify jQuery and plugins are available
            if (typeof (window as any).$ === 'undefined') {
                console.error('jQuery not loaded')
                setError('jQuery not available')
                return
            }

            if (typeof (window as any).$.fn.mousewheel === 'undefined') {
                console.error('jQuery mousewheel not loaded')
                setError('jQuery mousewheel plugin not available')
                return
            }

            // Check if spectrum is available, retry if not
            if (typeof (window as any).$.fn.spectrum === 'undefined') {
                retryCount++
                if (retryCount < maxRetries) {
                    console.log(`Waiting for Spectrum to register... (attempt ${retryCount}/${maxRetries})`)
                    setTimeout(tryInitialize, 200)
                    return
                } else {
                    console.error('Spectrum color picker not loaded after retries')
                    setError('Spectrum color picker plugin not available')
                    return
                }
            }

            console.log('✅ All dependencies verified!')
            console.log('Initializing Luckysheet...')
            console.log('Container:', container)
            console.log('jQuery version:', (window as any).$.fn.jquery)
            console.log('Spectrum available:', typeof (window as any).$.fn.spectrum)
            console.log('Loading data:', data ? 'From database' : 'Default empty')

            import('luckysheet')
                .then((luckysheetModule) => {
                    const luckysheet = luckysheetModule.default || luckysheetModule

                    // Destroy existing instance if it exists
                    try {
                        if ((window as any).luckysheet && (window as any).luckysheet.destroy) {
                            console.log('Destroying previous Luckysheet instance')
                                ; (window as any).luckysheet.destroy()
                        }
                    } catch (e) {
                        console.log('No previous instance to destroy')
                    }

                    // Clear the container
                    container.innerHTML = ''

                    // Default data with dark mode styling
                    const defaultData = data || [
                        {
                            name: 'Sheet1',
                            color: '',
                            status: '1',
                            order: '0',
                            data: Array(50)
                                .fill(null)
                                .map(() =>
                                    Array(26)
                                        .fill(null)
                                        .map(() => ({
                                            v: '',
                                            bg: '#131316', // Dark background
                                            fc: '#e5e7eb', // Light text
                                        }))
                                ),
                            config: {
                                borderInfo: [
                                    {
                                        rangeType: 'range',
                                        borderType: 'border-all',
                                        style: '1',
                                        color: '#ffffff',
                                        range: [{ row: [0, 49], column: [0, 25] }],
                                    },
                                ],
                            },
                            index: '0',
                        },
                    ]

                    try {
                        luckysheet.create({
                            container: containerId,
                            data: defaultData,
                            title: 'TeamForge Sheets',
                            showinfobar: false,
                            showtoolbar: true,
                            showsheetbar: true,
                            showstatisticBar: true,
                            sheetFormulaBar: true,
                            enableAddRow: true,
                            enableAddCol: true,
                            userInfo: false,
                            lang: 'en',
                            allowUpdate: true,
                            showtoolbarConfig: {
                                undoRedo: false, // Disabled to prevent runtime errors with arrow keys
                                paintFormat: true,
                                currencyFormat: true,
                                percentageFormat: true,
                                numberDecrease: true,
                                numberIncrease: true,
                                moreFormats: true,
                                font: true,
                                fontSize: true,
                                bold: true,
                                italic: true,
                                strikethrough: true,
                                underline: true,
                                textColor: true,
                                fillColor: true,
                                border: true,
                                mergeCell: true,
                                horizontalAlignMode: true,
                                verticalAlignMode: true,
                                textWrapMode: true,
                                textRotateMode: true,
                                image: true,
                                link: true,
                                chart: true,
                                postil: true,
                                pivotTable: true,
                                function: true,
                                frozenMode: true,
                                sortAndFilter: true,
                                conditionalFormat: true,
                                dataVerification: true,
                                splitColumn: true,
                                screenshot: true,
                                findAndReplace: true,
                                protection: true,
                                print: true,
                            },
                            hook: {
                                cellUpdated: (r: number, c: number, oldValue: any, newValue: any) => {
                                    if (onChange && luckysheet.getAllSheets) {
                                        // Trigger onChange with current workbook data
                                        onChange(luckysheet.getAllSheets())
                                    }
                                },
                            },
                        })

                        console.log('✅ Luckysheet initialized successfully!')
                        instanceRef.current = true
                    } catch (err) {
                        console.error('❌ Luckysheet initialization error:', err)
                        setError(`Initialization failed: ${err}`)
                    }
                })
                .catch((err) => {
                    console.error('❌ Failed to load Luckysheet module:', err)
                    setError(`Failed to load Luckysheet: ${err}`)
                })
        }

        // Reset instance ref and start initialization
        instanceRef.current = false
        tryInitialize()

        return () => {
            // Cleanup handled by instance ref and destroy in next initialization
        }
    }, [scriptsLoaded, containerId, data, onChange])

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                    <p className="text-red-500 font-semibold mb-2">Error loading Luckysheet</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <p className="text-xs text-muted-foreground mt-2">Check browser console for details</p>
                </div>
            </div>
        )
    }

    if (!scriptsLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading spreadsheet dependencies...</p>
            </div>
        )
    }

    return (
        <div
            id={containerId}
            ref={containerRef}
            style={{
                margin: '0px',
                padding: '0px',
                position: 'absolute',
                left: 0,
                top: 0,
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    )
}
