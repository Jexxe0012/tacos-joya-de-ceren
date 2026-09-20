document.addEventListener("DOMContentLoaded", function () {

  
    const formulario = document.getElementById("form-merma");
    const inputIngrediente = document.getElementById("input-ingrediente");
    const inputCantidad = document.getElementById("input-cantidad");
    const tablaHistorial = document.getElementById("tabla-historial");
    const inputMotivo = document.getElementById("input-motivo");
    const inputResponsable = document.getElementById("input-responsable");

    formulario.addEventListener("submit", function (e) {
       
        e.preventDefault();

  
        const ingrediente = inputIngrediente.value.trim();
        const cantidad = inputCantidad.value.trim();
        const motivo = inputMotivo.value.trim();
        const responsable = inputResponsable.value.trim();

        
        if (ingrediente === "" || cantidad === "" || motivo === "" || responsable === "") {
            alert("Por favor completa todos los campos.");
            return;
        }

        
        const fechaActual = new Date().toISOString().split("T")[0];

      
        const nuevaFila = document.createElement("tr");
        nuevaFila.innerHTML = `
            <td>${fechaActual}</td>
            <td>${ingrediente}</td>
            <td>${cantidad}</td>
            <td><span class="badge bg-warning text-dark">Registrado</span></td>
        `;

       
        tablaHistorial.prepend(nuevaFila);

       
        formulario.reset();

        alert("¡Merma registrada exitosamente en el historial!");
    });

});