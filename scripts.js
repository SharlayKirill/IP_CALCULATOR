function calculate() {
	const ipForm = document.getElementById("ipInput").value;
    const maskForm = document.getElementById("maskSelect").value;
    const ipWithPrefix = `${ipForm}/${maskForm}`;
    const [ip, prefix] = ipWithPrefix.split('/');
    if (!ip || !prefix || isNaN(prefix) || prefix < 16 || prefix > 32) {
        alert('Введите корректный IP-адрес и префикс.');
        return;
    }

    const prefixInt = parseInt(prefix, 10);
    const ipParts = ip.split('.').map(part => parseInt(part, 10));
    if (ipParts.length !== 4 || ipParts.some(part => part < 0 || part > 255)) {
        alert('Введите корректный IP-адрес.');
        return;
    }

    const mask = (0xFFFFFFFF << (32 - prefixInt)) >>> 0;
    const inverseMask = ~mask >>> 0;
    const networkAddress = (ipToInt(ipParts) & mask) >>> 0;
    const broadcastAddress = (networkAddress | inverseMask) >>> 0;
    const hostCount = Math.pow(2, 32 - prefixInt);

    document.getElementById('initialData').innerHTML = `
        <tr><th>Name</th><th>Dec</th><th>Bin</th></tr>
        <tr><td>IP Address</td><td>${ip}</td><td>${ipParts.map(part => part.toString(2).padStart(8, '0')).join('.')}</td></tr>
        <tr><td>Netmask</td><td>${intToIp(mask)}</td><td>${mask.toString(2).padStart(32, '0').match(/.{8}/g).join('.')}</td></tr>
        <tr><td>Wildcard</td><td>${intToIp(inverseMask)}</td><td>${inverseMask.toString(2).padStart(32, '0').match(/.{8}/g).join('.')}</td></tr>
        <tr><td>Network</td><td>${intToIp(networkAddress)}</td><td>${networkAddress.toString(2).padStart(32, '0').match(/.{8}/g).join('.')}</td></tr>
        <tr><td>Broadcast</td><td>${intToIp(broadcastAddress)}</td><td>${broadcastAddress.toString(2).padStart(32, '0').match(/.{8}/g).join('.')}</td></tr>
        <tr><td>Hosts</td><td>${hostCount}</td><td></td></tr>
    `;
	
    generateCIDRMap(networkAddress, prefixInt, ip);
 }

 function generateCIDRMap(networkAddress, prefixInt, ipAddr) {
     const table = document.getElementById('cidrMap');
     table.innerHTML = ''; // очищаем таблицу

     const maxPrefix = 32;
     const headers = Array.from({length: maxPrefix + 1}, (_, i) => maxPrefix - i);

     // Заголовок таблицы
     let headerRow = '<tr>';
     //headers.forEach(header => headerRow += `<th class="PREF${header}">/${header}</th>`);
	headers.forEach(header => {
		const isInactive = Math.abs(header - prefixInt) > 1 ? ' inactive' : '';
		headerRow += `<th class="PREF${header}${isInactive}">/${header}</th>`;
	});
     headerRow += '</tr>';
     table.innerHTML += headerRow;

     // Построчно строим ячейки для каждого уровня подсетей
     let rowCount = 1 << (32 - prefixInt);
     let ipInt = networkAddress;
     let rowsHtml = '';

     let addedZeroPrefix = false;

     for (let row = 0; row < rowCount; row++) {
		let rowHtml = '<tr>';
		headers.forEach((prefix, index) => {
			const hosts = 2 ** (32 - prefix);
			let rowspan = Math.min(Math.pow(2, index), rowCount);
			
			// Определяем, что ячейка будет последней в столбце
			const isLastInColumn = (row + rowspan >= rowCount);
			
			if (prefix === 0 && !addedZeroPrefix) {
				// Для подсети /0 всегда используем 0.0.0.0
				const subnetIp = '0.0.0.0';
			rowHtml += `<td class="PREF${prefix} td-hidden last-visible" rowspan="${rowspan}" title="4 294 967 296"><span class="hidden">${subnetIp}</span></td>`;
				addedZeroPrefix = true;	
			} else {
				if (row % hosts === 0) {
					const subnetIp = intToIp((ipInt & (0xFFFFFFFF << (32 - prefix))) >>> 0);
					if (Math.abs(prefix - prefixInt) <= 1) {
						rowHtml += `<td class="PREF${prefix}${isLastInColumn ? ' last-visible' : ''}" rowspan="${rowspan}" title="${hosts.toLocaleString('ru-RU')}"><span>${subnetIp}</span></td>`;
					}
					else {
						rowHtml += `<td class="PREF${prefix} td-hidden ${isLastInColumn ? ' last-visible' : ''}" rowspan="${rowspan}" title="${hosts.toLocaleString('ru-RU')}"><span class="hidden">${subnetIp}</span></td>`;
					}
				}
			}
		});
		rowHtml += '</tr>';
		rowsHtml += rowHtml;
		ipInt++;
	}

     table.innerHTML += rowsHtml;
	addEventListenersToHeaders(document.getElementById('cidrMap'));
 }

 function ipToInt(ipArray) {
     return ((ipArray[0] << 24) | (ipArray[1] << 16) | (ipArray[2] << 8) | ipArray[3]) >>> 0;
 }

 function intToIp(int) {
     return [(int >>> 24), (int >>> 16 & 0xFF), (int >>> 8 & 0xFF), (int & 0xFF)].join('.');
 }

function addEventListenersToHeaders(table) {
	const headers = table.querySelectorAll('th');
	headers.forEach(th => {
		th.addEventListener('click', function () {
			toggleColumnVisibility(this, table);
		});
	});
}

function toggleColumnVisibility(th, table) {
	// Определяем класс столбца на основе класса <th>
	const columnClass = th.className;
	const spans = table.querySelectorAll(`td.${th.classList[0]} span`);
	const cells = table.querySelectorAll(`td.${th.classList[0]}`);
	// Переключаем класс hidden для ячеек и оформления заголовка
	spans.forEach(cell => cell.classList.toggle('hidden'));
	cells.forEach(cell => cell.classList.toggle('td-hidden'));
	th.classList.toggle('inactive'); // Изменяем стиль заголовка
}