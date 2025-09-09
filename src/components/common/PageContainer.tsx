import { ReactNode } from 'react';

interface PageContainerProps {
	title: string;
	children: ReactNode;
}

export default function PageContainer({ title, children }: PageContainerProps) {
	return (
		<div className="w-full flex flex-col  justify-center max-w-full p-4 sm:p-6 md:p-8 lg:p-12 mt-6 sm:mt-10 md:mt-16 lg:mt-20 container">
			<h1 className="text-2xl font-bold mb-6">{title}</h1>
			{children}
		</div>
	);
}
