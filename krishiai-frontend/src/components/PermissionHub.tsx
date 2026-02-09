import React, { useState } from 'react';

interface PermissionHubProps {
	lang: 'bn' | 'en';
	onComplete: () => void;
}

export const PermissionHub: React.FC<PermissionHubProps> = ({ lang, onComplete }) => {
	const [agreed, setAgreed] = useState(false);

	const handleAgree = () => {
		localStorage.setItem('agritech_permissions_granted', 'true');
		onComplete();
	};

	const handleSkip = () => {
		localStorage.setItem('agritech_permissions_skipped', 'true');
		onComplete();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
				<div className="text-center space-y-4 mb-8">
					<h1 className="text-3xl font-black text-emerald-600">
						{lang === 'bn' ? 'কৃষি এআই' : 'Krishi AI'}
					</h1>
					<h2 className="text-xl font-bold text-slate-800">
						{lang === 'bn' ? 'অনুমতি প্রয়োজন' : 'Permission Required'}
					</h2>
					<p className="text-slate-600 text-sm leading-relaxed">
						{lang === 'bn'
							? 'আপনার অভিজ্ঞতা উন্নত করতে আমাদের আপনার অবস্থান এবং ডিভাইস তথ্য অ্যাক্সেস করতে হবে।'
							: 'We need access to your location and device information to improve your experience.'}
					</p>
				</div>

				<div className="space-y-3 mb-6">
					<div className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-lg">
						<input
							type="checkbox"
							checked={agreed}
							onChange={(e) => setAgreed(e.target.checked)}
							className="mt-1 w-5 h-5 text-emerald-600 rounded cursor-pointer"
						/>
						<label className="text-sm text-slate-700 cursor-pointer flex-1">
							{lang === 'bn'
								? 'আমি অনুমতি দিচ্ছি'
								: 'I agree to share permissions'}
						</label>
					</div>
				</div>

				<div className="space-y-3">
					<button
						onClick={handleAgree}
						disabled={!agreed}
						className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors"
					>
						{lang === 'bn' ? 'সম্মত' : 'Agree'}
					</button>
					<button
						onClick={handleSkip}
						className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
					>
						{lang === 'bn' ? 'পরে' : 'Later'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default PermissionHub;
