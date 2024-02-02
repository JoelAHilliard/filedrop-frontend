import { render } from 'preact';
import { LocationProvider, Router, Route } from 'preact-iso';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home/index.jsx';
import { NotFound } from './pages/_404.jsx';
import './style.css';
import { ThemeProvider } from './components/theme-provider.js';
import { Toaster } from './components/ui/toaster.js';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
  } from "@/components/ui/accordion"
  
export function App() {
	return (
		<LocationProvider>
			<ThemeProvider>
			<div class="max-w-screen-lg max-w-container mx-auto w-full flex flex-col min-h-screen py-4 justify-between gap-2 px-2">
				<Header />
				<main class="flex-grow mt-4">
					<Router>
						<Route path="/" component={Home} />
						<Route default component={NotFound} />
					</Router>
				</main>
				<Toaster />
				<div id='footer' class="mt-auto">
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="item-1">
							<AccordionTrigger>What is Filedrop?</AccordionTrigger>
							<AccordionContent>
								Filedrop is a solution for swift and uncomplicated file sharing between computers. Designed for speed and simplicity, this application allows users to pass files quickly without the need for an account or any complicated setup.
							</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-2">
							<AccordionTrigger>Is Filedrop for long-term storage?</AccordionTrigger>
							<AccordionContent>
								No. As soon as the file is downloaded, or 2 hours after initial upload, the file is deleted. Fastfile is not a long-term storage solution.
							</AccordionContent>
						</AccordionItem>
						{/* <AccordionItem value="item-3">
							<AccordionTrigger>Can Filedrop see my uploads?</AccordionTrigger>
							<AccordionContent>
								Yes (for now). I'm working on encrypting each file with the code generated at type of upload.
							</AccordionContent>
						</AccordionItem> */}
					</Accordion>
				</div>
			</div>
			</ThemeProvider>
		</LocationProvider>
	);
}

render(<App />, document.getElementById('app'));
